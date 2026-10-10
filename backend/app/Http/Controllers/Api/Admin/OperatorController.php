<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\InvoiceStatus;
use App\Http\Controllers\Controller;
use App\Models\BusOperator;
use App\Support\ActivityLog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rule;

class OperatorController extends Controller
{
    private const SORTABLE = ['company_name', 'created_at', 'students_count', 'last_login_at'];

    /**
     * The operator list: searchable, filterable and paged on the server so it
     * stays fast with hundreds of operators.
     */
    public function index(Request $request)
    {
        $request->validate([
            'status' => ['nullable', Rule::in(['active', 'suspended'])],
            'billplz' => ['nullable', Rule::in(['connected', 'none'])],
            'plan_id' => ['nullable', 'integer'],
            'over_limit' => ['nullable', 'boolean'],
            'attention' => ['nullable', Rule::in(BusOperator::ATTENTION)],
            'sort' => ['nullable', Rule::in(self::SORTABLE)],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
        ]);

        $query = BusOperator::query()
            ->with('plan:id,name,code,student_limit')
            ->withCount(['students', 'buses', 'staff', 'routes', 'parents'])
            ->withCount(['students as active_students_count' => fn (Builder $s) => $s->where('enrollment_status', 'active')])
            // Only the operator's own owner logins count — parents logging in is not "the operator is active".
            ->withMax(['users as last_login_at' => fn (Builder $users) => $users->operatorOwners()], 'last_login_at');

        $this->matchSearch($query, $request);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->input('billplz') === 'connected') {
            $query->billplzConnected();
        } elseif ($request->input('billplz') === 'none') {
            $query->billplzMissing();
        }

        // Same definitions the dashboard's "needs attention" counts use.
        if ($request->filled('attention')) {
            $query->attention($request->input('attention'));
        }

        if ($request->filled('plan_id')) {
            $query->where('plan_id', $request->integer('plan_id'));
        }

        if ($request->boolean('over_limit')) {
            $query->overPlanLimit();
        }

        $sort = $request->input('sort', 'company_name');
        $direction = $request->input('direction', $sort === 'company_name' ? 'asc' : 'desc');

        return $query->orderBy($sort, $direction)->orderBy('id')->paginate(20);
    }

    /** Just id + name, for dropdowns that don't need the whole list. */
    public function options()
    {
        // toBase(): plain rows, so the model's appended logo/Billplz attributes don't tag along.
        return BusOperator::query()->orderBy('company_name')->toBase()->get(['id', 'company_name']);
    }

    /**
     * Mirrors what the operator sees across their own portal (students, fleet,
     * staff, routes, finances) so the platform admin can inspect one tenant in
     * full without impersonating them.
     */
    public function show(BusOperator $operator)
    {
        $operator->loadCount(['students', 'buses', 'staff', 'routes', 'parents']);
        $operator->loadCount(['students as active_students_count' => fn (Builder $s) => $s->where('enrollment_status', 'active')]);
        $operator->load([
            'plan:id,name,code,student_limit',
            'buses' => fn ($query) => $query->orderBy('plate_number'),
            'staff' => fn ($query) => $query->orderBy('full_name'),
            'routes' => fn ($query) => $query
                ->with(['bus:id,plate_number', 'driver:id,full_name', 'conductor:id,full_name'])
                ->withCount('stops')
                ->orderBy('name'),
            'students' => fn ($query) => $query
                ->with(['parentProfile:id,full_name,phone,email', 'route:id,name'])
                ->orderBy('full_name'),
        ]);

        $totalExpected = (float) $operator->invoices()->sum('final_amount');
        $totalCollected = (float) $operator->invoices()->where('status', InvoiceStatus::Paid)->sum('final_amount');
        $overdueCount = $operator->invoices()
            ->where('status', InvoiceStatus::Issued)
            ->whereDate('due_date', '<', now())
            ->count();

        return [
            ...$operator->toArray(),
            // Hidden from the operator's own payloads, but the platform team needs it.
            'suspended_reason' => $operator->suspended_reason,
            'last_login_at' => $operator->users()->operatorOwners()->max('last_login_at'),
            'billplz' => $operator->billplzSummary(),
            'finance_summary' => [
                'total_expected' => $totalExpected,
                'total_collected' => $totalCollected,
                'total_outstanding' => round($totalExpected - $totalCollected, 2),
                'overdue_count' => $overdueCount,
            ],
        ];
    }

    /**
     * Company details only. The login email is deliberately not editable here:
     * it belongs to the owner's login and changing one without the other would
     * lock them out.
     */
    public function update(Request $request, BusOperator $operator)
    {
        $data = $request->validate([
            'company_name' => 'required|string|max:255',
            'contact_person' => 'required|string|max:255',
            'contact_phone' => 'required|string|max:255',
        ]);

        $before = $operator->only(array_keys($data));
        $operator->update($data);

        ActivityLog::record('operator_updated', $operator->id, [
            'fields' => array_keys(array_diff_assoc($data, $before)),
        ]);

        return $operator->fresh();
    }

    public function suspend(Request $request, BusOperator $operator)
    {
        $data = $request->validate(['reason' => 'nullable|string|max:1000']);

        $operator->forceFill([
            'status' => 'suspended',
            'suspended_at' => now(),
            'suspended_reason' => $data['reason'] ?? null,
        ])->save();

        ActivityLog::record('operator_suspended', $operator->id, array_filter(['reason' => $data['reason'] ?? null]));

        return $this->statusPayload($operator);
    }

    public function reactivate(BusOperator $operator)
    {
        $operator->forceFill([
            'status' => 'active',
            'suspended_at' => null,
            'suspended_reason' => null,
        ])->save();

        ActivityLog::record('operator_reactivated', $operator->id);

        return $this->statusPayload($operator);
    }

    /** Emails the operator's owner the usual "choose a new password" link. */
    public function sendPasswordReset(BusOperator $operator)
    {
        $owner = $operator->adminUser();
        abort_unless($owner, 422, 'This operator has no owner login.');

        Password::sendResetLink(['email' => $owner->email]);

        ActivityLog::record('operator_password_reset_sent', $operator->id);

        return response()->json(['message' => 'Sent', 'email' => $owner->email]);
    }

    private function statusPayload(BusOperator $operator): array
    {
        return [
            'status' => $operator->status,
            'suspended_at' => $operator->suspended_at,
            'suspended_reason' => $operator->suspended_reason,
        ];
    }

    /** Matches company name, code, email or phone anywhere in the text, ignoring case. */
    private function matchSearch(Builder $query, Request $request): void
    {
        $text = $request->string('search')->trim()->lower()->toString();

        if ($text === '') {
            return;
        }

        // Escaped so a typed % or _ is a plain character, not a wildcard.
        $term = '%'.addcslashes($text, '%_\\').'%';

        $query->where(function (Builder $q) use ($term) {
            foreach (['company_name', 'operator_code', 'email', 'contact_phone'] as $column) {
                $q->orWhereRaw("LOWER(bus_operators.{$column}) LIKE ? ESCAPE '\\'", [$term]);
            }
        });
    }
}
