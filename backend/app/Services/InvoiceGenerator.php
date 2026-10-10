<?php

namespace App\Services;

use App\Enums\InvoiceItemType;
use App\Enums\InvoiceStatus;
use App\Enums\PackageType;
use App\Models\Invoice;
use App\Models\Student;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Calendar-month billing: every student gets one bill per billed month,
 * covering the 1st to the end of that month, whatever day they joined.
 */
class InvoiceGenerator
{
    public function __construct(private readonly FeeCalculator $feeCalculator)
    {
    }

    /** Today's date where the operators are (see config app.billing_timezone). */
    public static function today(): Carbon
    {
        return Carbon::parse(now(config('app.billing_timezone'))->toDateString());
    }

    public static function currentMonth(): Carbon
    {
        return self::today()->startOfMonth();
    }

    /**
     * Bills a newly enrolled student for the current month (spec §6.2 step 7).
     * Returns null when this month isn't billed for them — a holiday month, or
     * the operator chose to start billing next month.
     *
     * @param  float|null  $firstMonthAmount  what to charge instead of the full fee, e.g. for a mid-month join
     */
    public function generate(Student $student, ?float $firstMonthAmount = null): ?Invoice
    {
        $month = self::currentMonth();

        if (! $this->isBillable($student, $month)) {
            return null;
        }

        return $this->generateForMonth($student, $month, $firstMonthAmount);
    }

    /**
     * Whether the operator's billed months and the student's own billing
     * window (start and end month) allow a bill for this month.
     */
    public function isBillable(Student $student, Carbon $month): bool
    {
        $billedMonths = $student->busOperator->resolvedBillingConfig()['billed_months'];

        if (! in_array($month->month, $billedMonths, true)) {
            return false;
        }

        $start = $month->copy()->startOfMonth();

        if ($student->billing_starts_on && $start->lt($student->billing_starts_on->copy()->startOfMonth())) {
            return false;
        }

        return ! $student->billing_ends_on
            || $start->lte($student->billing_ends_on->copy()->startOfMonth());
    }

    /**
     * What the student's next automatic bill will be — the same rules the daily
     * job applies, so the screen can say it in advance. Either the next bill
     * (month, amount, due date) or a `reason` there won't be one:
     * suspended, withdrawn, ended, no_fee or no_billed_months.
     */
    public function preview(Student $student): array
    {
        if ($student->enrollment_status !== 'active') {
            return ['reason' => $student->enrollment_status];
        }

        $monthlyFee = $student->monthlyFee();

        if ($monthlyFee === null) {
            return ['reason' => 'no_fee'];
        }

        if ($student->busOperator->resolvedBillingConfig()['billed_months'] === []) {
            return ['reason' => 'no_billed_months'];
        }

        $month = self::currentMonth();

        // Two years ahead is more than any real schedule needs.
        for ($i = 0; $i < 24; $i++, $month = $month->copy()->addMonth()) {
            if ($student->billing_ends_on && $month->gt($student->billing_ends_on->copy()->startOfMonth())) {
                return ['reason' => 'ended', 'ended_on' => $student->billing_ends_on->copy()->startOfMonth()->toDateString()];
            }

            // Skips holiday months, months before the start, and months already billed.
            if (! $this->isBillable($student, $month) || $this->invoiceForMonth($student, $month)) {
                continue;
            }

            $fee = $this->feeCalculator->calculate(
                tenant: $student->busOperator,
                monthlyFee: $monthlyFee,
                childPosition: $this->childPosition($student),
                isCustomFee: $student->fee_override !== null,
            );

            return [
                'month' => $month->toDateString(),
                'amount' => $fee['final_amount'],
                'amount_before_discount' => $fee['amount_before_discount'],
                'sibling_discount_rate' => $fee['sibling_discount_rate'],
                'due_date' => $this->dueDate($student, $month)->toDateString(),
            ];
        }

        return ['reason' => 'no_billed_months'];
    }

    /**
     * The student's live (non-void) bill for a month, if any. Matched on the
     * month the period starts in, so bills from before calendar-month billing
     * (which ran from the join date) still count for their month.
     */
    public function invoiceForMonth(Student $student, Carbon $month): ?Invoice
    {
        $start = $month->copy()->startOfMonth();

        return Invoice::withoutGlobalScopes()
            ->where('student_id', $student->id)
            ->where('status', '!=', InvoiceStatus::Void)
            ->whereDate('period_start', '>=', $start)
            ->whereDate('period_start', '<', $start->copy()->addMonth())
            ->first();
    }

    /**
     * Issues the student's bill for one calendar month, priced from their
     * *current* route/package/discount config (not a snapshot from enrollment)
     * so rate changes apply from the next bill. Safe to call twice: the
     * existing bill for that month is returned instead of a duplicate.
     *
     * Does not check isBillable() — the operator may deliberately bill a month
     * the schedule would skip.
     */
    public function generateForMonth(Student $student, Carbon $month, ?float $firstMonthAmount = null): Invoice
    {
        $periodStart = $month->copy()->startOfMonth();

        return DB::transaction(function () use ($student, $periodStart, $firstMonthAmount) {
            // Serialises two callers billing the same student (the daily job and
            // an operator action), so the check below can't race into a duplicate.
            Student::withoutGlobalScopes()->whereKey($student->id)->lockForUpdate()->first();

            if ($existing = $this->invoiceForMonth($student, $periodStart)) {
                return $existing;
            }

            $route = $student->route;
            $monthlyFee = $student->monthlyFee();

            if (! $route || $monthlyFee === null) {
                throw new RuntimeException('Student\'s route has no monthly fee configured.');
            }

            $fee = $this->feeCalculator->calculate(
                tenant: $student->busOperator,
                monthlyFee: $monthlyFee,
                childPosition: $this->childPosition($student),
                isCustomFee: $student->fee_override !== null,
            );

            $invoice = Invoice::create([
                // Explicit, not left to BelongsToTenant's creating hook: this service
                // may run outside a request's TenantContext (queue jobs, artisan, tests).
                'tenant_id' => $student->tenant_id,
                'student_id' => $student->id,
                'route_id' => $route->id,
                'package_type' => $student->package_type,
                'billing_period' => $student->billing_period,
                'period_start' => $periodStart->toDateString(),
                'period_end' => $periodStart->copy()->addMonth()->toDateString(),
                'status' => InvoiceStatus::Issued,
                'due_date' => $this->dueDate($student, $periodStart)->toDateString(),
                'issued_at' => now(),
            ]);

            $package = $student->package_type === PackageType::OneWay ? 'One-way' : 'Return';

            $this->addItem($invoice, InvoiceItemType::Fee, "Bus fee - {$route->name} ({$package})", $fee['amount_before_discount']);

            if ($fee['discount_amount'] > 0) {
                $rate = rtrim(rtrim(number_format($fee['sibling_discount_rate'], 2, '.', ''), '0'), '.');
                $this->addItem($invoice, InvoiceItemType::Discount, "Sibling discount ({$rate}%)", -$fee['discount_amount']);
            }

            if ($firstMonthAmount !== null && round($firstMonthAmount - $fee['final_amount'], 2) != 0) {
                $this->addItem(
                    $invoice,
                    InvoiceItemType::Adjustment,
                    'First month adjustment',
                    round($firstMonthAmount - $fee['final_amount'], 2),
                );
            }

            $invoice->recalculateTotals();

            return $invoice;
        });
    }

    private function addItem(Invoice $invoice, InvoiceItemType $type, string $description, float $amount): void
    {
        $invoice->items()->create([
            'tenant_id' => $invoice->tenant_id,
            'type' => $type,
            'description' => $description,
            'amount' => $amount,
        ]);
    }

    /**
     * The operator's due day in the billed month. A bill raised after that day
     * has passed (late join, re-issue) gets 7 days instead of being born overdue.
     */
    private function dueDate(Student $student, Carbon $periodStart): Carbon
    {
        $dueDay = $student->busOperator->resolvedBillingConfig()['due_day'];
        $due = $periodStart->copy()->day(min($dueDay, $periodStart->daysInMonth));
        $today = self::today();

        return $due->lt($today) ? $today->addDays(7) : $due;
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
