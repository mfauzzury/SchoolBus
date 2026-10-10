<?php

namespace Tests\Feature\Operator;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class OutstandingControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    public function test_unpaid_balances_are_rolled_up_per_parent_largest_first(): void
    {
        $this->travelTo('2026-10-20 03:00:00');
        $tenant = $this->createTenant();
        $staff = $this->createOperatorStaff($tenant);

        [, $bigDebtor] = $this->createParent($tenant, [], ['full_name' => 'Big Debtor']);
        $kidA = Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $bigDebtor->id, 'full_name' => 'Kid A']);
        $kidB = Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $bigDebtor->id, 'full_name' => 'Kid B']);
        $partPaid = Invoice::factory()->create(['tenant_id' => $tenant->id, 'student_id' => $kidA->id, 'due_date' => '2026-10-07']);
        $partPaid->payments()->create(['tenant_id' => $tenant->id, 'method' => 'cash', 'payment_date' => '2026-10-08', 'amount_paid' => 50]);
        Invoice::factory()->create(['tenant_id' => $tenant->id, 'student_id' => $kidB->id, 'due_date' => '2026-10-27']);

        [, $smallDebtor] = $this->createParent($tenant, [], ['full_name' => 'Small Debtor']);
        $kidC = Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $smallDebtor->id]);
        Invoice::factory()->create(['tenant_id' => $tenant->id, 'student_id' => $kidC->id, 'due_date' => '2026-10-27', 'final_amount' => 90]);

        $response = $this->actingAs($staff)->getJson('/api/operator/outstanding');

        $response->assertOk()->assertJsonCount(2)
            ->assertJsonPath('0.parent.full_name', 'Big Debtor')
            ->assertJsonPath('0.students.0.full_name', 'Kid A')
            ->assertJsonPath('0.students.0.id', $kidA->id)
            ->assertJsonPath('0.students.1.full_name', 'Kid B')
            ->assertJsonPath('0.invoice_count', 2)
            ->assertJsonPath('0.total_outstanding', 250)   // (150 - 50) + 150
            ->assertJsonPath('0.oldest_due_date', '2026-10-07')
            ->assertJsonPath('0.days_overdue', 13)
            ->assertJsonPath('1.parent.full_name', 'Small Debtor')
            ->assertJsonPath('1.total_outstanding', 90)
            ->assertJsonPath('1.days_overdue', 0);
    }

    public function test_paid_cancelled_and_other_tenants_bills_are_not_owed(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $this->createInvoiceForTenant($tenant, ['status' => InvoiceStatus::Paid]);
        $this->createInvoiceForTenant($tenant, ['status' => InvoiceStatus::Void]);
        $this->createInvoiceForTenant($this->createTenant());

        $this->actingAs($admin)->getJson('/api/operator/outstanding')->assertOk()->assertJsonCount(0);
    }
}
