<?php

namespace Tests\Feature\Operator;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class NextBillsControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo('2026-11-12 10:00:00');
    }

    public function test_it_lists_this_months_pending_bills_with_amounts_and_due_dates(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $student = $this->createBillableStudent($tenant, [], ['base_monthly_fee' => 120]);

        $this->actingAs($admin)->getJson('/api/operator/next-bills')
            ->assertOk()
            ->assertJsonPath('month', '2026-11-01')
            ->assertJsonPath('is_current_month', true)
            ->assertJsonCount(1, 'rows')
            ->assertJsonPath('rows.0.student_id', $student->id)
            ->assertJsonPath('rows.0.amount', 120)
            ->assertJsonPath('total', 120)
            // The 7th has passed, so the bill gets 7 days, like the real thing.
            ->assertJsonPath('rows.0.due_date', '2026-11-19')
            ->assertJsonPath('mode', 'auto');
    }

    public function test_once_this_month_is_billed_it_shows_the_next_month_to_review_ahead(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $student = $this->createBillableStudent($tenant);
        $this->actingAs($admin)->postJson('/api/operator/next-bills', ['month' => '2026-11', 'student_ids' => [$student->id]])->assertOk();

        $this->getJson('/api/operator/next-bills')
            ->assertOk()
            ->assertJsonPath('month', '2026-12-01')
            ->assertJsonPath('is_current_month', false)
            ->assertJsonPath('rows.0.student_id', $student->id)
            ->assertJsonPath('rows.0.due_date', '2026-12-07');
    }

    public function test_students_who_cannot_be_billed_are_listed_as_problems_not_dropped(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $noRoute = $this->createBillableStudent($tenant);
        $noRoute->update(['route_id' => null]);
        $noFee = $this->createBillableStudent($tenant, [], ['base_monthly_fee' => null, 'one_way_monthly_fee' => null]);

        $this->actingAs($admin)->getJson('/api/operator/next-bills')
            ->assertOk()
            ->assertJsonCount(0, 'rows')
            ->assertJsonCount(2, 'problems')
            ->assertJsonFragment(['student_id' => $noRoute->id, 'reason' => 'no_route'])
            ->assertJsonFragment(['student_id' => $noFee->id, 'reason' => 'no_fee']);
    }

    public function test_suspended_students_and_already_billed_students_are_not_listed(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $this->createBillableStudent($tenant, ['enrollment_status' => 'suspended']);
        $billed = $this->createBillableStudent($tenant);
        Invoice::factory()->create([
            'tenant_id' => $tenant->id, 'student_id' => $billed->id,
            'period_start' => '2026-11-01', 'status' => InvoiceStatus::Issued,
        ]);

        $this->actingAs($admin)->getJson('/api/operator/next-bills?month=2026-11')
            ->assertOk()
            ->assertJsonCount(0, 'rows')
            ->assertJsonPath('already_billed', 1);
    }

    public function test_sibling_discount_follows_enrolment_order(): void
    {
        $tenant = $this->createTenant(['discount_config' => ['sibling_discounts' => ['1' => 0, '2' => 10, '3' => 10]]]);
        $admin = $this->createOperatorAdmin($tenant);
        $first = $this->createBillableStudent($tenant, [], ['base_monthly_fee' => 100]);
        $second = $this->createBillableStudent($tenant, ['parent_id' => $first->parent_id], ['base_monthly_fee' => 100]);

        $rows = collect($this->actingAs($admin)->getJson('/api/operator/next-bills')->json('rows'))->keyBy('student_id');

        $this->assertEquals(100, $rows[$first->id]['amount']);
        $this->assertEquals(90, $rows[$second->id]['amount']);
    }

    public function test_only_this_operators_students_appear(): void
    {
        $admin = $this->createOperatorAdmin($this->createTenant());
        $this->createBillableStudent($this->createTenant());

        $this->actingAs($admin)->getJson('/api/operator/next-bills')->assertOk()->assertJsonCount(0, 'rows');
    }

    public function test_admin_creates_only_the_ticked_bills_and_a_second_press_does_not_duplicate(): void
    {
        $tenant = $this->createTenant(['billing_config' => ['mode' => 'manual']]);
        $admin = $this->createOperatorAdmin($tenant);
        $ticked = $this->createBillableStudent($tenant);
        $left = $this->createBillableStudent($tenant);

        $payload = ['month' => '2026-11', 'student_ids' => [$ticked->id]];
        $this->actingAs($admin)->postJson('/api/operator/next-bills', $payload)->assertOk()->assertJsonPath('created', 1);
        $this->postJson('/api/operator/next-bills', $payload)->assertOk()->assertJsonPath('created', 0);

        $this->assertSame(1, $ticked->invoices()->count());
        $this->assertSame(0, $left->invoices()->count());
        $this->assertSame('manual', $tenant->fresh()->lastBillRun()['source']);
    }

    public function test_it_cannot_bill_students_of_another_operator(): void
    {
        $admin = $this->createOperatorAdmin($this->createTenant());
        $stranger = $this->createBillableStudent($this->createTenant());

        $this->actingAs($admin)->postJson('/api/operator/next-bills', ['month' => '2026-11', 'student_ids' => [$stranger->id]])
            ->assertOk()->assertJsonPath('created', 0);

        $this->assertSame(0, Invoice::withoutGlobalScopes()->where('student_id', $stranger->id)->count());
    }

    public function test_staff_can_look_but_not_create(): void
    {
        $tenant = $this->createTenant();
        $staff = $this->createOperatorStaff($tenant);
        $student = $this->createBillableStudent($tenant);

        $this->actingAs($staff)->getJson('/api/operator/next-bills')->assertOk();
        $this->postJson('/api/operator/next-bills', ['month' => '2026-11', 'student_ids' => [$student->id]])->assertForbidden();
    }

    public function test_summary_says_how_many_are_waiting_only_for_manual_operators(): void
    {
        $auto = $this->createTenant();
        $this->createBillableStudent($auto);
        $manual = $this->createTenant(['billing_config' => ['mode' => 'manual']]);
        $this->createBillableStudent($manual);
        $this->createBillableStudent($manual);

        $this->actingAs($this->createOperatorAdmin($auto))->getJson('/api/operator/next-bills/summary')
            ->assertOk()->assertJsonPath('mode', 'auto')->assertJsonPath('waiting', 0);
        $this->actingAs($this->createOperatorAdmin($manual))->getJson('/api/operator/next-bills/summary')
            ->assertOk()->assertJsonPath('mode', 'manual')->assertJsonPath('waiting', 2);
    }
}
