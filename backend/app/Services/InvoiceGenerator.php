<?php

namespace App\Services;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\Student;
use Illuminate\Support\Carbon;
use RuntimeException;

class InvoiceGenerator
{
    public function __construct(private readonly FeeCalculator $feeCalculator)
    {
    }

    /**
     * Generates and issues a student's first invoice at enrollment,
     * per spec §6.2 step 7 and §6.3 step 1.
     */
    public function generate(Student $student): Invoice
    {
        return $this->generateForPeriod($student, Carbon::today());
    }

    /**
     * Generates and issues an invoice covering the one-month period starting
     * at $periodStart, recalculating the fee from the student's *current*
     * route/discount config each time (not a snapshot from enrollment) —
     * this is what lets recurring billing pick up rate changes. Due 7 days
     * after the period starts. Used both by enrollment (generate()) and by
     * the recurring billing command for every subsequent month.
     */
    public function generateForPeriod(Student $student, Carbon $periodStart): Invoice
    {
        $route = $student->route;
        $baseMonthlyFee = $student->fee_override ?? $route?->base_monthly_fee;

        if (! $route || $baseMonthlyFee === null) {
            throw new RuntimeException('Student\'s route has no base monthly fee configured.');
        }

        $fee = $this->feeCalculator->calculate(
            tenant: $student->busOperator,
            baseMonthlyFee: (float) $baseMonthlyFee,
            billingPeriod: $student->billing_period,
            childPosition: $this->childPosition($student),
        );

        return Invoice::create([
            // Explicit, not left to BelongsToTenant's creating hook: this service
            // may run outside a request's TenantContext (queue jobs, artisan, tests).
            'tenant_id' => $student->tenant_id,
            'student_id' => $student->id,
            'route_id' => $route->id,
            'package_type' => $student->package_type,
            'billing_period' => $student->billing_period,
            'period_start' => $periodStart->toDateString(),
            'period_end' => $periodStart->copy()->addMonthNoOverflow()->toDateString(),
            'amount_before_discount' => $fee['amount_before_discount'],
            'discount_amount' => $fee['discount_amount'],
            'final_amount' => $fee['final_amount'],
            'status' => InvoiceStatus::Issued,
            'due_date' => $periodStart->copy()->addDays(7)->toDateString(),
            'issued_at' => now(),
        ]);
    }

    /**
     * 1-indexed position of this student among their parent's students,
     * ordered by enrollment (id) ascending — drives the sibling discount tier.
     */
    private function childPosition(Student $student): int
    {
        return $student->parentProfile->students()
            ->orderBy('id')
            ->pluck('id')
            ->search($student->id) + 1;
    }
}
