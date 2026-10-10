<?php

namespace Tests\Feature\Operator;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\Route;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class InvoiceControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    public function test_ledger_can_be_filtered_by_status(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        Invoice::factory()->create(['tenant_id' => $tenant->id, 'status' => InvoiceStatus::Paid]);
        Invoice::factory()->create(['tenant_id' => $tenant->id, 'status' => InvoiceStatus::Issued]);

        $response = $this->actingAs($admin)->getJson('/api/operator/invoices?status=paid');

        $response->assertOk()->assertJsonCount(1);
        $this->assertSame('paid', $response->json('0.status'));
    }

    public function test_overdue_filter_matches_issued_invoices_past_due_date_without_a_stored_overdue_status(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        Invoice::factory()->create([
            'tenant_id' => $tenant->id, 'status' => InvoiceStatus::Issued, 'due_date' => now()->subDays(3),
        ]);
        Invoice::factory()->create([
            'tenant_id' => $tenant->id, 'status' => InvoiceStatus::Issued, 'due_date' => now()->addDays(3),
        ]);

        $response = $this->actingAs($admin)->getJson('/api/operator/invoices?status=overdue');

        $response->assertOk()->assertJsonCount(1);
    }

    public function test_ledger_can_be_filtered_by_route(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $routeA = Route::factory()->create(['tenant_id' => $tenant->id]);
        $routeB = Route::factory()->create(['tenant_id' => $tenant->id]);
        Invoice::factory()->create(['tenant_id' => $tenant->id, 'route_id' => $routeA->id]);
        Invoice::factory()->create(['tenant_id' => $tenant->id, 'route_id' => $routeB->id]);

        $response = $this->actingAs($admin)->getJson("/api/operator/invoices?route_id={$routeA->id}");

        $response->assertOk()->assertJsonCount(1);
        $this->assertSame($routeA->id, $response->json('0.route_id'));
    }

    public function test_csv_export_contains_a_header_row_and_invoice_data(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $this->createInvoiceForTenant($tenant, ['final_amount' => 150]);

        $response = $this->actingAs($admin)->get('/api/operator/invoices/export');

        $response->assertOk();
        $response->assertHeader('content-type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('Invoice ID', $response->getContent());
        $this->assertStringContainsString('150', $response->getContent());
    }

    public function test_staff_can_view_the_ledger_and_export_but_not_record_payments(): void
    {
        $tenant = $this->createTenant();
        $staff = $this->createOperatorStaff($tenant);
        $this->createInvoiceForTenant($tenant);

        $this->actingAs($staff)->getJson('/api/operator/invoices')->assertOk();
        $this->actingAs($staff)->get('/api/operator/invoices/export')->assertOk();
    }

    /** A child with one bill, under a parent with the given name. */
    private function billFor($tenant, string $parentName, string $childName, array $invoice = []): Invoice
    {
        [, $parent] = $this->createParent($tenant, [], ['full_name' => $parentName]);

        return $this->billForParent($tenant, $parent, $childName, $invoice);
    }

    private function billForParent($tenant, $parent, string $childName, array $invoice = []): Invoice
    {
        $student = \App\Models\Student::factory()->create([
            'tenant_id' => $tenant->id,
            'parent_id' => $parent->id,
            'full_name' => $childName,
        ]);

        return Invoice::factory()->create([...$invoice, 'tenant_id' => $tenant->id, 'student_id' => $student->id]);
    }

    public function test_ledger_can_be_searched_by_child_or_parent_name_ignoring_case(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $this->billFor($tenant, 'Rajesh Kumar', 'Aditya Kumar');
        $this->billFor($tenant, 'Tan Mei Ling', 'Jun Wei');

        $byChild = $this->actingAs($admin)->getJson('/api/operator/invoices?search=aditya');
        $byParent = $this->actingAs($admin)->getJson('/api/operator/invoices?search=MEI LING');

        $byChild->assertOk()->assertJsonCount(1)->assertJsonPath('0.student.full_name', 'Aditya Kumar');
        $byParent->assertOk()->assertJsonCount(1)->assertJsonPath('0.student.full_name', 'Jun Wei');
        $this->actingAs($admin)->getJson('/api/operator/invoices?search=nobody')->assertOk()->assertJsonCount(0);
    }

    public function test_a_percent_sign_in_the_search_is_not_a_wildcard(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $this->billFor($tenant, 'Rajesh Kumar', 'Aditya Kumar');

        $this->actingAs($admin)->getJson('/api/operator/invoices?search=%25')->assertOk()->assertJsonCount(0);
    }

    public function test_search_never_returns_another_tenants_bills(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $this->billFor($this->createTenant(), 'Same Name', 'Same Child');

        $this->actingAs($admin)->getJson('/api/operator/invoices?search=same')->assertOk()->assertJsonCount(0);
    }

    public function test_search_also_narrows_the_summary_totals(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $this->billFor($tenant, 'Rajesh Kumar', 'Aditya Kumar', ['final_amount' => 150]);
        $this->billFor($tenant, 'Tan Mei Ling', 'Jun Wei', ['final_amount' => 90]);

        $this->actingAs($admin)->getJson('/api/operator/dashboard/summary?search=kumar')
            ->assertOk()
            ->assertJsonPath('total_expected', 150);
    }

    public function test_history_can_be_limited_to_one_child_or_one_parents_children(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        [, $parent] = $this->createParent($tenant);
        $first = $this->billForParent($tenant, $parent, 'First Child');
        $second = $this->billForParent($tenant, $parent, 'Second Child');
        $this->billFor($tenant, 'Someone Else', 'Other Child');

        $family = $this->actingAs($admin)->getJson("/api/operator/invoices?parent_id={$parent->id}");
        $one = $this->actingAs($admin)->getJson("/api/operator/invoices?student_id={$second->student_id}");

        $family->assertOk()->assertJsonCount(2);
        $this->assertEqualsCanonicalizing([$first->id, $second->id], collect($family->json())->pluck('id')->all());
        $one->assertOk()->assertJsonCount(1)->assertJsonPath('0.id', $second->id);
    }

    public function test_cancelled_bills_appear_in_a_history_only_when_asked_for(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        [, $parent] = $this->createParent($tenant);
        $this->billForParent($tenant, $parent, 'Child', ['status' => InvoiceStatus::Void]);

        $this->actingAs($admin)->getJson("/api/operator/invoices?parent_id={$parent->id}")->assertOk()->assertJsonCount(0);
        $this->actingAs($admin)->getJson("/api/operator/invoices?parent_id={$parent->id}&include_void=1")
            ->assertOk()->assertJsonCount(1)->assertJsonPath('0.status', 'void');
    }

    public function test_a_single_bill_comes_back_with_lines_payments_and_balance(): void
    {
        $tenant = $this->createTenant();
        $staff = $this->createOperatorStaff($tenant);
        $invoice = $this->billFor($tenant, 'Rajesh Kumar', 'Aditya Kumar');
        $invoice->payments()->create([
            'tenant_id' => $tenant->id,
            'method' => 'cash',
            'payment_date' => now()->toDateString(),
            'amount_paid' => 40,
        ]);

        $this->actingAs($staff)->getJson("/api/operator/invoices/{$invoice->id}")
            ->assertOk()
            ->assertJsonPath('student.full_name', 'Aditya Kumar')
            ->assertJsonPath('student.parent_profile.full_name', 'Rajesh Kumar')
            ->assertJsonCount(1, 'items')
            ->assertJsonCount(1, 'payments')
            ->assertJsonPath('amount_paid', '40.00')
            ->assertJsonPath('balance', '110.00');
    }

    public function test_cannot_open_another_tenants_bill(): void
    {
        $admin = $this->createOperatorAdmin($this->createTenant());
        $other = $this->billFor($this->createTenant(), 'Other Parent', 'Other Child');

        $this->actingAs($admin)->getJson("/api/operator/invoices/{$other->id}")->assertStatus(404);
    }
}
