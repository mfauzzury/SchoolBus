<?php

namespace Tests\Feature\Admin;

use App\Models\Payment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class TransactionControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    public function test_index_lists_payments_across_every_tenant(): void
    {
        $admin = $this->createSaasAdmin();
        $tenantA = $this->createTenant(['company_name' => 'Alpha Buses']);
        $tenantB = $this->createTenant(['company_name' => 'Beta Buses']);
        $invoiceA = $this->createInvoiceForTenant($tenantA);
        $invoiceB = $this->createInvoiceForTenant($tenantB);

        Payment::create([
            'tenant_id' => $tenantA->id,
            'invoice_id' => $invoiceA->id,
            'method' => 'cash',
            'reference_number' => 'A-1',
            'payment_date' => '2026-07-01',
            'amount_paid' => 150,
        ]);
        Payment::create([
            'tenant_id' => $tenantB->id,
            'invoice_id' => $invoiceB->id,
            'method' => 'fpx',
            'reference_number' => 'B-1',
            'payment_date' => '2026-07-10',
            'amount_paid' => 90,
        ]);

        $response = $this->actingAs($admin)->getJson('/api/admin/transactions');

        $response->assertOk()->assertJsonCount(2, 'data');
        $companies = collect($response->json('data'))->pluck('bus_operator.company_name')->all();
        $this->assertContains('Alpha Buses', $companies);
        $this->assertContains('Beta Buses', $companies);
    }

    public function test_index_filters_by_operator_method_and_date_range(): void
    {
        $admin = $this->createSaasAdmin();
        $tenantA = $this->createTenant();
        $tenantB = $this->createTenant();
        $invoiceA = $this->createInvoiceForTenant($tenantA);
        $invoiceB = $this->createInvoiceForTenant($tenantB);

        Payment::create([
            'tenant_id' => $tenantA->id, 'invoice_id' => $invoiceA->id,
            'method' => 'cash', 'payment_date' => '2026-07-01', 'amount_paid' => 150,
        ]);
        Payment::create([
            'tenant_id' => $tenantA->id, 'invoice_id' => $invoiceA->id,
            'method' => 'fpx', 'payment_date' => '2026-06-01', 'amount_paid' => 200,
        ]);
        Payment::create([
            'tenant_id' => $tenantB->id, 'invoice_id' => $invoiceB->id,
            'method' => 'cash', 'payment_date' => '2026-07-05', 'amount_paid' => 90,
        ]);

        $byOperator = $this->actingAs($admin)
            ->getJson("/api/admin/transactions?operator_id={$tenantA->id}");
        $byOperator->assertOk()->assertJsonCount(2, 'data');

        $byMethod = $this->actingAs($admin)->getJson('/api/admin/transactions?method=cash');
        $byMethod->assertOk()->assertJsonCount(2, 'data');

        $byDate = $this->actingAs($admin)
            ->getJson('/api/admin/transactions?date_from=2026-07-01&date_to=2026-07-31');
        $byDate->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_operator_admin_cannot_list_transactions(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        $this->actingAs($admin)->getJson('/api/admin/transactions')->assertStatus(403);
    }

    public function test_parent_cannot_list_transactions(): void
    {
        $tenant = $this->createTenant();
        [$parentUser] = $this->createParent($tenant);

        $this->actingAs($parentUser)->getJson('/api/admin/transactions')->assertStatus(403);
    }
}
