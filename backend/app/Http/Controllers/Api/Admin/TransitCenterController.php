<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\TransitCenter;
use App\Models\User;
use App\Support\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Transit centers, added and looked after by the platform team only. Each
 * belongs to one operator (chosen when it is added, never changed after, as
 * its children's plans live with that operator) and gets one login, sent by
 * email as a "set your password" link. A center that is switched off can no
 * longer log in; its record stays so past requests still make sense.
 */
class TransitCenterController extends Controller
{
    public function index(Request $request)
    {
        return TransitCenter::with(['user:id,last_login_at', 'busOperator:id,company_name'])
            ->when($request->filled('operator_id'), fn ($q) => $q->where('tenant_id', $request->integer('operator_id')))
            ->orderBy('name')
            ->get()
            ->map(fn (TransitCenter $center) => $this->present($center));
    }

    public function show(TransitCenter $transitCenter)
    {
        return $this->present($transitCenter->load(['user:id,last_login_at', 'busOperator:id,company_name']));
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $operatorId = $request->validate([
            'operator_id' => ['required', Rule::exists('bus_operators', 'id')],
        ])['operator_id'];

        // Set explicitly: platform staff have no tenant of their own.
        $center = TransitCenter::create([...$data, 'tenant_id' => $operatorId, 'status' => 'active']);

        ActivityLog::record('transit_center_created', $operatorId, ['center' => $center->name]);

        return response()->json($this->present($center->load('busOperator:id,company_name')), 201);
    }

    public function update(Request $request, TransitCenter $transitCenter)
    {
        $data = $this->validated($request, $transitCenter);

        DB::transaction(function () use ($transitCenter, $data) {
            $transitCenter->update($data);

            $user = $transitCenter->user;
            if (! $user) {
                return;
            }

            $user->forceFill([
                'name' => $transitCenter->name,
                'email' => $transitCenter->email,
                'deactivated_at' => $transitCenter->isActive() ? null : ($user->deactivated_at ?? now()),
            ])->save();

            if (! $transitCenter->isActive()) {
                // Log them out everywhere right away.
                DB::table('sessions')->where('user_id', $user->id)->delete();
                $user->tokens()->delete();
            }
        });

        ActivityLog::record('transit_center_updated', $transitCenter->tenant_id, ['center' => $transitCenter->name, 'status' => $transitCenter->status]);

        return $this->present($transitCenter->fresh()->load(['user:id,last_login_at', 'busOperator:id,company_name']));
    }

    /**
     * Creates the center's login the first time, then emails a link to set a
     * password. Pressing it again just sends a fresh link.
     */
    public function sendLogin(TransitCenter $transitCenter)
    {
        abort_unless($transitCenter->isActive(), 422, 'Switch this transit center on before sending a login.');

        DB::transaction(function () use ($transitCenter) {
            if ($transitCenter->user) {
                return;
            }

            if (User::where('email', $transitCenter->email)->exists()) {
                abort(422, 'This email already has a login. Use a different email for the transit center.');
            }

            // Nobody knows this password; the center sets its own from the emailed link.
            $user = User::create([
                'tenant_id' => $transitCenter->tenant_id,
                'name' => $transitCenter->name,
                'email' => $transitCenter->email,
                'password' => Str::random(40),
            ]);
            $user->assignRole('transit_center');

            $transitCenter->update(['user_id' => $user->id]);
        });

        Password::sendResetLink(['email' => $transitCenter->email]);

        ActivityLog::record('transit_center_login_sent', $transitCenter->tenant_id, ['center' => $transitCenter->name]);

        return $this->present($transitCenter->fresh()->load(['user:id,last_login_at', 'busOperator:id,company_name']));
    }

    private function validated(Request $request, ?TransitCenter $center = null): array
    {
        return $request->validate([
            'name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'required|string|max:50',
            'email' => [
                'required', 'email', 'max:255',
                Rule::unique('transit_centers', 'email')->ignore($center?->id),
                Rule::unique('users', 'email')->ignore($center?->user_id),
            ],
            'address' => 'nullable|string|max:500',
            'status' => $center ? ['sometimes', Rule::in(['active', 'inactive'])] : 'prohibited',
        ]);
    }

    private function present(TransitCenter $center): array
    {
        return [
            'id' => $center->id,
            'operator' => $center->busOperator?->only(['id', 'company_name']),
            'name' => $center->name,
            'contact_person' => $center->contact_person,
            'phone' => $center->phone,
            'email' => $center->email,
            'address' => $center->address,
            'status' => $center->status,
            'has_login' => $center->user_id !== null,
            'last_login_at' => $center->user?->last_login_at,
        ];
    }
}
