<?php

namespace Tests\Feature\Console;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class GenerateRecurringInvoicesTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private function runBilling(): void
    {
        $this->artisan('invoices:generate-recurring')->assertSuccessful();
    }

    public function test_every_active_student_is_billed_for_the_current_month_exactly_once(): void
    {
        $this->travelTo('2026-10-01 02:00:00');
        $tenant = $this->createTenant();
        $a = $this->createBillableStudent($tenant);
        $b = $this->createBillableStudent($tenant);

        $this->runBilling();
        $this->runBilling();

        $this->assertSame(1, $a->invoices()->count());
        $this->assertSame(1, $b->invoices()->count());
        $this->assertSame('2026-10-01', $a->invoices()->first()->period_start->toDateString());
        $this->assertSame('2026-10-07', $a->invoices()->first()->due_date->toDateString());
    }

    public function test_the_next_month_gets_its_own_bill_even_if_the_last_one_is_unpaid(): void
    {
        $student = $this->createBillableStudent($this->createTenant());

        $this->travelTo('2026-10-01 02:00:00');
        $this->runBilling();
        $this->travelTo('2026-11-01 02:00:00');
        $this->runBilling();

        $this->assertSame(
            ['2026-10-01', '2026-11-01'],
            $student->invoices()->orderBy('period_start')->get()->map(fn (Invoice $i) => $i->period_start->toDateString())->all(),
        );
    }

    public function test_months_the_operator_does_not_bill_are_skipped(): void
    {
        $holidayTenant = $this->createTenant(['billing_config' => ['billed_months' => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]]]);
        $holidayStudent = $this->createBillableStudent($holidayTenant);
        $otherStudent = $this->createBillableStudent($this->createTenant());

        $this->travelTo('2026-12-01 02:00:00');
        $this->runBilling();

        $this->assertSame(0, $holidayStudent->invoices()->count());
        $this->assertSame(1, $otherStudent->invoices()->count());

        $this->travelTo('2027-01-01 02:00:00');
        $this->runBilling();

        $this->assertSame(1, $holidayStudent->invoices()->count());
    }

    public function test_a_student_is_not_billed_before_their_billing_start(): void
    {
        $student = $this->createBillableStudent($this->createTenant(), ['billing_starts_on' => '2026-11-01']);

        $this->travelTo('2026-10-28 02:00:00');
        $this->runBilling();
        $this->assertSame(0, $student->invoices()->count());

        $this->travelTo('2026-11-01 02:00:00');
        $this->runBilling();
        $this->assertSame(1, $student->invoices()->count());
    }

    public function test_suspended_and_withdrawn_students_are_not_billed(): void
    {
        $this->travelTo('2026-10-01 02:00:00');
        $tenant = $this->createTenant();
        $suspended = $this->createBillableStudent($tenant, ['enrollment_status' => 'suspended']);
        $withdrawn = $this->createBillableStudent($tenant, ['enrollment_status' => 'withdrawn']);

        $this->runBilling();

        $this->assertSame(0, $suspended->invoices()->count());
        $this->assertSame(0, $withdrawn->invoices()->count());
    }

    public function test_a_bill_from_the_old_join_date_cycle_counts_for_its_month(): void
    {
        $this->travelTo('2026-10-20 02:00:00');
        $student = $this->createBillableStudent($this->createTenant());
        Invoice::factory()->create([
            'tenant_id' => $student->tenant_id,
            'student_id' => $student->id,
            'period_start' => '2026-10-17',
            'period_end' => '2026-11-17',
        ]);

        $this->runBilling();

        $this->assertSame(1, $student->invoices()->count());
    }

    public function test_a_cancelled_bill_does_not_stop_the_month_being_billed_again(): void
    {
        $this->travelTo('2026-10-05 02:00:00');
        $student = $this->createBillableStudent($this->createTenant());
        Invoice::factory()->create([
            'tenant_id' => $student->tenant_id,
            'student_id' => $student->id,
            'period_start' => '2026-10-01',
            'period_end' => '2026-11-01',
            'status' => InvoiceStatus::Void,
        ]);

        $this->runBilling();

        $this->assertSame(1, $student->invoices()->where('status', InvoiceStatus::Issued)->count());
    }

    public function test_a_student_without_a_price_is_skipped_without_stopping_the_others(): void
    {
        $this->travelTo('2026-10-01 02:00:00');
        $tenant = $this->createTenant();
        $unpriced = $this->createBillableStudent($tenant, [], ['base_monthly_fee' => null]);
        $priced = $this->createBillableStudent($tenant);

        $this->runBilling();

        $this->assertSame(0, $unpriced->invoices()->count());
        $this->assertSame(1, Student::find($priced->id)->invoices()->count());
    }

    public function test_a_student_is_not_billed_after_their_last_billed_month(): void
    {
        $student = $this->createBillableStudent($this->createTenant(), ['billing_ends_on' => '2026-10-01']);

        $this->travelTo('2026-10-01 02:00:00');
        $this->runBilling();
        $this->assertSame(1, $student->invoices()->count());

        $this->travelTo('2026-11-01 02:00:00');
        $this->runBilling();
        $this->assertSame(1, $student->invoices()->count());
    }
}
