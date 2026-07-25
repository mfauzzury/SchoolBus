<?php

namespace Tests\Feature\Admin;

use App\Enums\InvoiceStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class DashboardControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    public function test_summary_aggregates_across_every_tenant(): void
    {
        $admin = $this->createSaasAdmin();
        $tenantA = $this->createTenant();
        $tenantB = $this->createTenant();

        $this->createInvoiceForTenant($tenantA, ['final_amount' => 100, 'status' => InvoiceStatus::Issued]);
        $this->createInvoiceForTenant($tenantB, ['final_amount' => 200, 'status' => InvoiceStatus::Paid]);

        $response = $this->actingAs($admin)->getJson('/api/admin/dashboard/summary');

        $response->assertOk()
            ->assertJsonPath('total_expected', 300)
            ->assertJsonPath('total_collected', 200)
            ->assertJsonPath('total_outstanding', 100)
            ->assertJsonPath('total_operators', 2);
    }

    public function test_operator_admin_cannot_access_the_platform_dashboard(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        $this->actingAs($admin)->getJson('/api/admin/dashboard/summary')->assertStatus(403);
    }

    public function test_parent_cannot_access_the_platform_dashboard(): void
    {
        $tenant = $this->createTenant();
        [$parentUser] = $this->createParent($tenant);

        $this->actingAs($parentUser)->getJson('/api/admin/dashboard/summary')->assertStatus(403);
    }

    public function test_saas_admin_cannot_access_operator_routes(): void
    {
        // Blocked by EnsureTenant (no tenant_id), independent of role.
        $admin = $this->createSaasAdmin();

        $this->actingAs($admin)->getJson('/api/operator/dashboard/summary')->assertStatus(403);
    }
}
