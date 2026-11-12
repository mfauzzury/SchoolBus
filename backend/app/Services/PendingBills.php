<?php

namespace App\Services;

use App\Enums\InvoiceStatus;
use App\Models\BusOperator;
use App\Models\Invoice;
use App\Models\Student;
use Illuminate\Support\Carbon;

/**
 * "What bills are still to be made for a month?" — the Next bills page.
 * Applies the same rules as the daily job (InvoiceGenerator::isBillable, the
 * student's current fee and sibling discount) but only looks, never creates,
 * and does it for the whole operator in a handful of queries.
 */
class PendingBills
{
    public function __construct(private readonly InvoiceGenerator $generator, private readonly FeeCalculator $feeCalculator)
    {
    }

    /**
     * The month the operator should be looking at: the current month while it
     * still has bills to make, otherwise the next billed month, so they can
     * review ahead of the 1st.
     */
    public function reviewMonth(BusOperator $tenant): array
    {
        $first = null;
        $month = InvoiceGenerator::currentMonth();
        $billedMonths = $tenant->resolvedBillingConfig()['billed_months'];

        for ($i = 0; $i < 12; $i++, $month = $month->copy()->addMonth()) {
            if (! in_array($month->month, $billedMonths, true)) {
                continue;
            }

            $result = $this->forMonth($tenant, $month);
            $first ??= $result;

            if ($result['rows'] || $result['problems']) {
                return $result;
            }
        }

        return $first ?? $this->forMonth($tenant, InvoiceGenerator::currentMonth());
    }

    /**
     * Everyone who should get a bill for $month and doesn't have one yet.
     * `rows` are bills that can be made; `problems` are students who should be
     * billed but can't be (no route, or the route has no price).
     */
    public function forMonth(BusOperator $tenant, Carbon $month): array
    {
        $month = $month->copy()->startOfMonth();

        $students = Student::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->with(['route:id,name,base_monthly_fee,one_way_monthly_fee', 'parentProfile:id,full_name'])
            ->orderBy('id')
            ->get();

        // 1st, 2nd, 3rd child by enrolment order — the sibling discount tier.
        $position = [];
        $seen = [];
        foreach ($students as $student) {
            $seen[$student->parent_id] = ($seen[$student->parent_id] ?? 0) + 1;
            $position[$student->id] = $seen[$student->parent_id];
        }

        $billed = Invoice::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('status', '!=', InvoiceStatus::Void)
            ->whereDate('period_start', '>=', $month)
            ->whereDate('period_start', '<', $month->copy()->addMonth())
            ->pluck('student_id')
            ->flip();

        $rows = [];
        $problems = [];

        foreach ($students as $student) {
            if ($student->enrollment_status !== 'active' || $billed->has($student->id)) {
                continue;
            }

            $student->setRelation('busOperator', $tenant);

            if (! $this->generator->isBillable($student, $month)) {
                continue;
            }

            $monthlyFee = $student->monthlyFee();

            if ($monthlyFee === null) {
                $problems[] = [
                    'student_id' => $student->id,
                    'student_name' => $student->full_name,
                    'reason' => $student->route ? 'no_fee' : 'no_route',
                ];

                continue;
            }

            $fee = $this->feeCalculator->calculate(
                tenant: $tenant,
                monthlyFee: $monthlyFee,
                childPosition: $position[$student->id],
                isCustomFee: $student->fee_override !== null,
            );

            $rows[] = [
                'student_id' => $student->id,
                'student_name' => $student->full_name,
                'parent_name' => $student->parentProfile?->full_name,
                'route_id' => $student->route_id,
                'route_name' => $student->route?->name,
                'package_type' => $student->package_type,
                'amount' => $fee['final_amount'],
                'amount_before_discount' => $fee['amount_before_discount'],
                'sibling_discount_rate' => $fee['sibling_discount_rate'],
                'is_custom_fee' => $student->fee_override !== null,
                'due_date' => $this->generator->dueDate($student, $month)->toDateString(),
            ];
        }

        return [
            'month' => $month->toDateString(),
            'is_current_month' => $month->equalTo(InvoiceGenerator::currentMonth()),
            'rows' => $rows,
            'problems' => $problems,
            'total' => round(array_sum(array_column($rows, 'amount')), 2),
            'already_billed' => $billed->count(),
        ];
    }
}
