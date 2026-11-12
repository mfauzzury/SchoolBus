<?php

namespace App\Http\Controllers\Api\Operator;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Services\InvoiceGenerator;
use App\Services\Notifier;
use App\Services\PendingBills;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use RuntimeException;

/**
 * The Next bills page: see every bill that is still to be made, then (for
 * operators who create their own bills) create them.
 */
class NextBillsController extends Controller
{
    public function index(Request $request, PendingBills $pending)
    {
        $tenant = $request->user()->busOperator;

        $request->validate(['month' => 'sometimes|date_format:Y-m']);

        $result = $request->filled('month')
            ? $pending->forMonth($tenant, Carbon::createFromFormat('Y-m', $request->string('month')->toString())->startOfMonth())
            : $pending->reviewMonth($tenant);

        return [
            ...$result,
            'mode' => $tenant->resolvedBillingConfig()['mode'],
            'last_run' => $tenant->lastBillRun(),
        ];
    }

    /** For the menu badge and the home-page banner: is this month's billing waiting on the operator? */
    public function summary(Request $request, PendingBills $pending)
    {
        $tenant = $request->user()->busOperator;

        if (! $tenant->billsAreManual()) {
            return ['mode' => 'auto', 'waiting' => 0, 'month' => null];
        }

        $current = $pending->forMonth($tenant, InvoiceGenerator::currentMonth());

        return [
            'mode' => 'manual',
            'waiting' => count($current['rows']),
            'month' => $current['month'],
        ];
    }

    public function store(Request $request, PendingBills $pending, InvoiceGenerator $generator, Notifier $notifier)
    {
        $data = $request->validate([
            'month' => 'required|date_format:Y-m',
            'student_ids' => 'required|array|min:1',
            'student_ids.*' => 'integer|distinct',
        ]);

        // A few hundred bills in one go; each is several queries.
        set_time_limit(300);

        $tenant = $request->user()->busOperator;
        $month = Carbon::createFromFormat('Y-m', $data['month'])->startOfMonth();

        // Only bills still pending right now: someone else may have made one since the page loaded.
        $ids = collect($pending->forMonth($tenant, $month)['rows'])
            ->pluck('student_id')
            ->intersect($data['student_ids'])
            ->all();

        $issued = [];
        $failed = 0;

        Student::whereIn('id', $ids)->with(['route', 'busOperator', 'parentProfile'])->orderBy('id')->each(
            function (Student $student) use ($generator, $month, &$issued, &$failed) {
                try {
                    $issued[] = $generator->generateForMonth($student, $month);
                } catch (RuntimeException) {
                    $failed++;
                }
            },
        );

        // One email per parent, however many children they have.
        $notifier->billsIssued($issued);

        $tenant->recordBillRun('manual', count($issued), $failed);

        return [
            'created' => count($issued),
            'failed' => $failed,
            'month' => $month->toDateString(),
        ];
    }
}
