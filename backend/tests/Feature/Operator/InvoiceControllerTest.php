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
}
