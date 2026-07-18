<?php

namespace App\Services;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\Student;
use RuntimeException;

class InvoiceGenerator
{
    public function __construct(private readonly FeeCalculator $feeCalculator)
    {
    }

    /**
     * Generates and issues an invoice for a student's current route/package/billing
     * period, per spec §6.2 step 7 and §6.3 step 1. Due 7 days from generation.
     */
    public function generate(Student $student): Invoice
    {
        $route = $student->route;

        if (! $route || $route->base_monthly_fee === null) {
            throw new RuntimeException('Student\'s route has no base monthly fee configured.');
        }

        $fee = $this->feeCalculator->calculate(
            tenant: $student->busOperator,
            baseMonthlyFee: (float) $route->base_monthly_fee,
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
            'amount_before_discount' => $fee['amount_before_discount'],
            'discount_amount' => $fee['discount_amount'],
            'final_amount' => $fee['final_amount'],
            'status' => InvoiceStatus::Issued,
            'due_date' => now()->addDays(7)->toDateString(),
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
