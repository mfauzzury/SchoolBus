<?php

namespace Tests\Feature\Transit;

use App\Enums\InvoiceStatus;
use App\Models\BusOperator;
use App\Models\Invoice;
use App\Models\Route;
use App\Models\RouteStop;
use App\Models\Student;
use App\Models\TransitCenter;
use App\Models\User;
use App\Services\InvoiceGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

/**
 * Abu's bus fee is RM150 and he is the second child (10% sibling discount on
 * the bus fee). Going via Bright Kids TC adds RM90 a month, with no discount.
 */
class TransitBillingTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private BusOperator $tenant;

    private User $admin;

    private User $centerUser;

    private Student $abu;

    private Route $route;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->travelTo('2026-11-12 10:00:00');

        $this->tenant = $this->createTenant();
        $this->admin = $this->createOperatorAdmin($this->tenant);

        $this->ensureRole('transit_center');
        $this->centerUser = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->centerUser->assignRole('transit_center');
        TransitCenter::create([
            'tenant_id' => $this->tenant->id, 'user_id' => $this->centerUser->id, 'name' => 'Bright Kids TC',
            'phone' => '03-555 0000', 'email' => $this->centerUser->email, 'status' => 'active',
            'monthly_price' => 90,
        ]);

        $elder = $this->createBillableStudent($this->tenant);
        $this->abu = $this->createBillableStudent($this->tenant, ['parent_id' => $elder->parent_id, 'full_name' => 'Abu']);
        $this->route = $this->abu->route;
        RouteStop::create(['tenant_id' => $this->tenant->id, 'route_id' => $this->route->id, 'name' => 'Taman Abu', 'sequence' => 1]);
    }

    /** Center asks for "school to center" from $startsOn; the operator approves at RM90. */
    private function approvePlan(string $startsOn, array $extra = [])
    {
        $id = $this->actingAs($this->centerUser)->postJson('/api/transit/requests', [
            'student_id' => $this->abu->id,
            'legs' => ['school_to_center'],
            'starts_on' => $startsOn,
        ])->assertCreated()->json('id');

        return $this->actingAs($this->admin)->postJson("/api/operator/transit-requests/{$id}/approve", [
            'monthly_amount' => 90,
            'starts_on' => $startsOn,
            'legs' => [['leg' => 'school_to_center', 'route_id' => $this->route->id, 'center_after_stop_id' => null]],
            ...$extra,
        ])->assertOk();
    }

    private function bill(string $month): Invoice
    {
        return app(InvoiceGenerator::class)->generateForMonth($this->abu->fresh(), Carbon::parse($month));
    }

    private function lines(Invoice $invoice): array
    {
        return $invoice->fresh()->items()->orderBy('id')->get()
            ->map(fn ($i) => [$i->type->value, $i->description, (float) $i->amount])->all();
    }

    public function test_the_bill_gets_a_transit_line_without_sibling_discount(): void
    {
        $this->approvePlan('2026-11-20');

        $invoice = $this->bill('2026-12-01');

        $this->assertSame([
            ['fee', 'Bus fee - '.$this->route->name.' (Return)', 150.0],
            ['discount', 'Sibling discount (10%)', -15.0],
            ['extra', 'Transit center: Bright Kids TC', 90.0],
        ], $this->lines($invoice));
        $this->assertEquals(225, (float) $invoice->fresh()->final_amount);
    }

    public function test_the_plans_start_month_is_billed_unless_the_operator_starts_billing_next_month(): void
    {
        $this->approvePlan('2026-11-20', ['bill_from' => 'next_month']);

        $this->assertNotContains('extra', array_column($this->lines($this->bill('2026-11-01')), 0));
        $this->assertContains('extra', array_column($this->lines($this->bill('2026-12-01')), 0));
    }

    public function test_approving_late_adds_the_line_to_this_months_unpaid_bill(): void
    {
        $november = $this->bill('2026-11-01');
        $this->assertEquals(135, (float) $november->final_amount);

        $this->approvePlan('2026-11-20')
            ->assertJsonPath('billing.added', ['2026-11-01'])
            ->assertJsonPath('billing.not_changed', []);

        $this->assertEquals(225, (float) $november->fresh()->final_amount);

        // Making the bill again never adds the line twice.
        $this->bill('2026-11-01');
        $this->assertSame(1, $november->items()->where('type', 'extra')->count());
    }

    public function test_a_paid_bill_is_left_alone_and_the_operator_is_told(): void
    {
        $november = $this->bill('2026-11-01');
        $november->update(['status' => InvoiceStatus::Paid, 'paid_at' => now()]);

        $this->approvePlan('2026-11-20')
            ->assertJsonPath('billing.added', [])
            ->assertJsonPath('billing.not_changed', ['2026-11-01']);

        $this->assertEquals(135, (float) $november->fresh()->final_amount);
    }

    public function test_stopping_takes_the_line_off_later_unpaid_bills_but_bills_the_last_month(): void
    {
        $this->approvePlan('2026-11-13');
        $december = $this->bill('2026-12-01');
        $this->assertEquals(225, (float) $december->fresh()->final_amount);

        $stop = $this->actingAs($this->centerUser)->postJson('/api/transit/requests/stop', [
            'student_id' => $this->abu->id, 'ends_on' => '2026-11-30',
        ])->assertCreated()->json('id');
        $this->actingAs($this->admin)->postJson("/api/operator/transit-requests/{$stop}/approve", ['ends_on' => '2026-11-30'])
            ->assertOk()
            ->assertJsonPath('billing.not_changed', []);

        $this->assertEquals(135, (float) $december->fresh()->final_amount);
        $this->assertContains('extra', array_column($this->lines($this->bill('2026-11-01')), 0));
        $this->assertNotContains('extra', array_column($this->lines($this->bill('2027-01-01')), 0));
    }

    public function test_next_bills_and_the_students_next_bill_include_the_transit_charge(): void
    {
        $this->approvePlan('2026-11-20');

        $row = collect($this->actingAs($this->admin)->getJson('/api/operator/next-bills?month=2026-11')->assertOk()->json('rows'))
            ->firstWhere('student_id', $this->abu->id);
        $this->assertEquals(225, $row['amount']);
        $this->assertEquals(90, $row['extras_amount']);
        $this->assertSame('Transit center: Bright Kids TC', $row['extras'][0]['label']);

        $this->actingAs($this->admin)->getJson("/api/operator/students/{$this->abu->id}")
            ->assertOk()
            ->assertJsonPath('next_bill.amount', 225)
            ->assertJsonPath('next_bill.extras.0.amount', 90);
    }

    public function test_the_daily_job_bills_the_transit_charge(): void
    {
        $this->approvePlan('2026-11-20');
        $this->travelTo('2026-12-01 08:00:00');

        $this->artisan('invoices:generate-recurring')->assertSuccessful();

        $december = Invoice::where('student_id', $this->abu->id)->whereDate('period_start', '2026-12-01')->sole();
        $this->assertEquals(225, (float) $december->final_amount);
    }
}
