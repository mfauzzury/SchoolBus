<?php

namespace Tests\Feature\Operator;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\Route;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class DashboardControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    public function test_summary_totals_expected_collected_and_outstanding(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        Invoice::factory()->create(['tenant_id' => $tenant->id, 'final_amount' => 100, 'status' => InvoiceStatus::Issued]);
        Invoice::factory()->create(['tenant_id' => $tenant->id, 'final_amount' => 200, 'status' => InvoiceStatus::Paid]);

        $response = $this->actingAs($admin)->getJson('/api/operator/dashboard/summary');

        $response->assertOk()
            ->assertJsonPath('total_expected', 300)
            ->assertJsonPath('total_collected', 200)
            ->assertJsonPath('total_outstanding', 100);
    }

    public function test_overdue_count_only_counts_issued_invoices_past_due_date(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        Invoice::factory()->create([
            'tenant_id' => $tenant->id, 'status' => InvoiceStatus::Issued, 'due_date' => now()->subDays(2),
        ]);
        Invoice::factory()->create([
            'tenant_id' => $tenant->id, 'status' => InvoiceStatus::Issued, 'due_date' => now()->addDays(2),
        ]);
        // Paid and past due shouldn't count as overdue.
        Invoice::factory()->create([
            'tenant_id' => $tenant->id, 'status' => InvoiceStatus::Paid, 'due_date' => now()->subDays(2),
        ]);

        $response = $this->actingAs($admin)->getJson('/api/operator/dashboard/summary');

        $response->assertOk()->assertJsonPath('overdue_count', 1);
    }

    public function test_summary_can_be_filtered_by_route(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $routeA = Route::factory()->create(['tenant_id' => $tenant->id]);
        $routeB = Route::factory()->create(['tenant_id' => $tenant->id]);

        Invoice::factory()->create(['tenant_id' => $tenant->id, 'route_id' => $routeA->id, 'final_amount' => 100]);
        Invoice::factory()->create(['tenant_id' => $tenant->id, 'route_id' => $routeB->id, 'final_amount' => 999]);

        $response = $this->actingAs($admin)->getJson("/api/operator/dashboard/summary?route_id={$routeA->id}");

        $response->assertOk()->assertJsonPath('total_expected', 100);
    }

    public function test_summary_excludes_another_tenants_invoices(): void
    {
        $tenantA = $this->createTenant();
        $tenantB = $this->createTenant();
        $adminA = $this->createOperatorAdmin($tenantA);

        Invoice::factory()->create(['tenant_id' => $tenantA->id, 'final_amount' => 100]);
        Invoice::factory()->create(['tenant_id' => $tenantB->id, 'final_amount' => 5000]);

        $response = $this->actingAs($adminA)->getJson('/api/operator/dashboard/summary');

        $response->assertOk()->assertJsonPath('total_expected', 100);
    }
}
