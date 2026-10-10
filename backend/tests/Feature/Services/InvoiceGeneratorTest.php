<?php

namespace Tests\Feature\Services;

use App\Enums\InvoiceItemType;
use App\Enums\InvoiceStatus;
use App\Enums\PackageType;
use App\Models\Route;
use App\Services\InvoiceGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class InvoiceGeneratorTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private function generator(): InvoiceGenerator
    {
        return app(InvoiceGenerator::class);
    }

    public function test_bills_the_whole_calendar_month_whatever_day_the_student_joined(): void
    {
        $this->travelTo('2026-10-17 10:00:00');
        $student = $this->createBillableStudent($this->createTenant());

        $invoice = $this->generator()->generate($student);

        $this->assertSame($student->id, $invoice->student_id);
        $this->assertSame($student->route_id, $invoice->route_id);
        $this->assertEquals(InvoiceStatus::Issued, $invoice->status);
        $this->assertSame('2026-10-01', $invoice->period_start->toDateString());
        $this->assertSame('2026-11-01', $invoice->period_end->toDateString());
        $this->assertEquals(150.0, (float) $invoice->final_amount);
        $this->assertNotNull($invoice->issued_at);
    }

    public function test_a_bill_issued_at_the_start_of_the_month_is_due_on_the_operators_due_day(): void
    {
        $this->travelTo('2026-10-01 10:00:00');
        $tenant = $this->createTenant(['billing_config' => ['due_day' => 10]]);

        $invoice = $this->generator()->generate($this->createBillableStudent($tenant));

        $this->assertSame('2026-10-10', $invoice->due_date->toDateString());
    }

    public function test_a_bill_raised_after_the_due_day_gets_seven_days_instead_of_being_born_overdue(): void
    {
        $this->travelTo('2026-10-17 10:00:00');

        $invoice = $this->generator()->generate($this->createBillableStudent($this->createTenant()));

        $this->assertSame('2026-10-24', $invoice->due_date->toDateString());
    }

    public function test_the_billing_month_follows_malaysian_time_not_utc(): void
    {
        // 17:00 UTC on 31 Oct is already 01:00 on 1 Nov in Kuala Lumpur.
        $this->travelTo('2026-10-31 17:00:00');

        $invoice = $this->generator()->generate($this->createBillableStudent($this->createTenant()));

        $this->assertSame('2026-11-01', $invoice->period_start->toDateString());
    }

    public function test_the_bill_is_itemised_and_its_totals_are_the_sum_of_the_items(): void
    {
        $tenant = $this->createTenant();
        $first = $this->createBillableStudent($tenant, [], ['name' => 'Route A', 'base_monthly_fee' => 100]);
        $second = $this->createBillableStudent($tenant, ['parent_id' => $first->parent_id], ['base_monthly_fee' => 100]);

        $firstInvoice = $this->generator()->generate($first);
        $secondInvoice = $this->generator()->generate($second);

        $this->assertCount(1, $firstInvoice->items);
        $this->assertEquals(InvoiceItemType::Fee, $firstInvoice->items[0]->type);
        $this->assertSame('Bus fee - Route A (Return)', $firstInvoice->items[0]->description);
        $this->assertEquals(100.0, (float) $firstInvoice->final_amount);

        // Second child of the same parent: 10% sibling discount as its own line.
        $this->assertCount(2, $secondInvoice->items);
        $this->assertEquals(InvoiceItemType::Discount, $secondInvoice->items[1]->type);
        $this->assertSame('Sibling discount (10%)', $secondInvoice->items[1]->description);
        $this->assertEquals(-10.0, (float) $secondInvoice->items[1]->amount);
        $this->assertEquals(100.0, (float) $secondInvoice->amount_before_discount);
        $this->assertEquals(10.0, (float) $secondInvoice->discount_amount);
        $this->assertEquals(90.0, (float) $secondInvoice->final_amount);
    }

    public function test_one_way_students_pay_the_routes_one_way_fee(): void
    {
        $student = $this->createBillableStudent(
            $this->createTenant(),
            ['package_type' => PackageType::OneWay],
            ['base_monthly_fee' => 150, 'one_way_monthly_fee' => 90],
        );

        $this->assertEquals(90.0, (float) $this->generator()->generate($student)->final_amount);
    }

    public function test_one_way_falls_back_to_the_return_fee_until_a_one_way_fee_is_set(): void
    {
        $student = $this->createBillableStudent(
            $this->createTenant(),
            ['package_type' => PackageType::OneWay],
            ['base_monthly_fee' => 150, 'one_way_monthly_fee' => null],
        );

        $this->assertEquals(150.0, (float) $this->generator()->generate($student)->final_amount);
    }

    public function test_a_custom_fee_is_billed_exactly_even_for_a_second_child(): void
    {
        $tenant = $this->createTenant();
        $first = $this->createBillableStudent($tenant);
        $second = $this->createBillableStudent($tenant, ['parent_id' => $first->parent_id, 'fee_override' => 80]);

        $invoice = $this->generator()->generate($second);

        $this->assertCount(1, $invoice->items);
        $this->assertEquals(80.0, (float) $invoice->final_amount);
    }

    public function test_a_first_month_amount_is_recorded_as_an_adjustment_line(): void
    {
        $student = $this->createBillableStudent($this->createTenant());

        $invoice = $this->generator()->generate($student, firstMonthAmount: 75);

        $this->assertCount(2, $invoice->items);
        $this->assertEquals(InvoiceItemType::Adjustment, $invoice->items[1]->type);
        $this->assertEquals(-75.0, (float) $invoice->items[1]->amount);
        $this->assertEquals(75.0, (float) $invoice->final_amount);
    }

    public function test_no_bill_is_raised_for_a_month_the_operator_does_not_bill(): void
    {
        $this->travelTo('2026-12-05 10:00:00');
        $tenant = $this->createTenant(['billing_config' => ['billed_months' => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]]]);
        $student = $this->createBillableStudent($tenant);

        $this->assertNull($this->generator()->generate($student));
        $this->assertSame(0, $student->invoices()->count());
    }

    public function test_no_bill_is_raised_before_the_students_billing_start(): void
    {
        $this->travelTo('2026-10-28 10:00:00');
        $student = $this->createBillableStudent($this->createTenant(), ['billing_starts_on' => '2026-11-01']);

        $this->assertNull($this->generator()->generate($student));
    }

    public function test_a_month_is_never_billed_twice(): void
    {
        $student = $this->createBillableStudent($this->createTenant());
        $month = Carbon::parse('2026-10-01');

        $first = $this->generator()->generateForMonth($student, $month);
        $second = $this->generator()->generateForMonth($student, $month);

        $this->assertSame($first->id, $second->id);
        $this->assertSame(1, $student->invoices()->count());
    }

    public function test_throws_when_the_route_has_no_monthly_fee(): void
    {
        $student = $this->createBillableStudent($this->createTenant(), [], ['base_monthly_fee' => null]);

        $this->expectException(\RuntimeException::class);

        $this->generator()->generate($student);
    }

    public function test_throws_when_the_student_has_no_route(): void
    {
        $student = $this->createBillableStudent($this->createTenant());
        Route::whereKey($student->route_id)->delete();

        $this->expectException(\RuntimeException::class);

        $this->generator()->generate($student->fresh());
    }

    public function test_no_bill_is_raised_after_the_students_last_billed_month(): void
    {
        $student = $this->createBillableStudent($this->createTenant(), ['billing_ends_on' => '2026-10-01']);

        $this->assertTrue($this->generator()->isBillable($student, Carbon::parse('2026-10-01')));
        $this->assertFalse($this->generator()->isBillable($student, Carbon::parse('2026-11-01')));
    }

    public function test_preview_is_the_current_month_until_it_has_been_billed(): void
    {
        $this->travelTo('2026-10-12 03:00:00');
        $student = $this->createBillableStudent($this->createTenant());

        $before = $this->generator()->preview($student);

        $this->assertSame('2026-10-01', $before['month']);
        $this->assertEquals(150.0, $before['amount']);
        // Past the due day, so the same rule as a real bill: seven days from today.
        $this->assertSame('2026-10-19', $before['due_date']);

        $this->generator()->generate($student);

        $after = $this->generator()->preview($student);
        $this->assertSame('2026-11-01', $after['month']);
        $this->assertSame('2026-11-07', $after['due_date']);
    }

    public function test_preview_skips_holiday_months_and_shows_the_sibling_discount(): void
    {
        $this->travelTo('2026-11-20 03:00:00');
        $tenant = $this->createTenant(['billing_config' => ['billed_months' => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]]]);
        $first = $this->createBillableStudent($tenant, [], ['base_monthly_fee' => 100]);
        $second = $this->createBillableStudent($tenant, ['parent_id' => $first->parent_id], ['base_monthly_fee' => 100]);
        $this->generator()->generate($second);

        $preview = $this->generator()->preview($second);

        // November is billed and December is a holiday, so the next bill is January.
        $this->assertSame('2027-01-01', $preview['month']);
        $this->assertEquals(90.0, $preview['amount']);
        $this->assertEquals(100.0, $preview['amount_before_discount']);
        $this->assertEquals(10.0, $preview['sibling_discount_rate']);
    }

    public function test_preview_waits_for_a_future_start_and_stops_at_the_end(): void
    {
        $this->travelTo('2026-10-12 03:00:00');
        $tenant = $this->createTenant();

        $starting = $this->createBillableStudent($tenant, ['billing_starts_on' => '2027-01-01']);
        $this->assertSame('2027-01-01', $this->generator()->preview($starting)['month']);

        $ended = $this->createBillableStudent($tenant, ['billing_ends_on' => '2026-09-01']);
        $this->assertSame(['reason' => 'ended', 'ended_on' => '2026-09-01'], $this->generator()->preview($ended));
    }

    public function test_preview_explains_why_there_is_no_next_bill(): void
    {
        $tenant = $this->createTenant();

        $suspended = $this->createBillableStudent($tenant, ['enrollment_status' => 'suspended']);
        $withdrawn = $this->createBillableStudent($tenant, ['enrollment_status' => 'withdrawn']);
        $noFee = $this->createBillableStudent($tenant, [], ['base_monthly_fee' => null]);

        $this->assertSame(['reason' => 'suspended'], $this->generator()->preview($suspended));
        $this->assertSame(['reason' => 'withdrawn'], $this->generator()->preview($withdrawn));
        $this->assertSame(['reason' => 'no_fee'], $this->generator()->preview($noFee));
    }
}
