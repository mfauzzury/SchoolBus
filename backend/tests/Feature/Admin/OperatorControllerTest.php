<?php

namespace Tests\Feature\Admin;

use App\Models\Bus;
use App\Models\Route;
use App\Models\Staff;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class OperatorControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    public function test_index_lists_every_tenant_with_counts(): void
    {
        $admin = $this->createSaasAdmin();
        $tenantA = $this->createTenant(['company_name' => 'Alpha Buses']);
        $tenantB = $this->createTenant(['company_name' => 'Beta Buses']);
        [, $parent] = $this->createParent($tenantA);
        Student::factory()->count(2)->create(['tenant_id' => $tenantA->id, 'parent_id' => $parent->id]);

        $response = $this->actingAs($admin)->getJson('/api/admin/operators');

        $response->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('total', 2);
        $alpha = collect($response->json('data'))->firstWhere('company_name', 'Alpha Buses');
        $this->assertSame(2, $alpha['students_count']);
        $beta = collect($response->json('data'))->firstWhere('company_name', 'Beta Buses');
        $this->assertSame(0, $beta['students_count']);
    }

    public function test_show_returns_a_single_operator_with_counts(): void
    {
        $admin = $this->createSaasAdmin();
        $tenant = $this->createTenant(['company_name' => 'Alpha Buses']);

        $response = $this->actingAs($admin)->getJson("/api/admin/operators/{$tenant->id}");

        $response->assertOk()
            ->assertJsonPath('company_name', 'Alpha Buses')
            ->assertJsonPath('students_count', 0);
    }

    public function test_show_returns_the_full_operator_breakdown(): void
    {
        $admin = $this->createSaasAdmin();
        $tenantA = $this->createTenant(['company_name' => 'Alpha Buses']);
        $tenantB = $this->createTenant(['company_name' => 'Beta Buses']);

        $bus = Bus::factory()->create(['tenant_id' => $tenantA->id, 'plate_number' => 'ABC1234']);
        $staff = Staff::factory()->create(['tenant_id' => $tenantA->id, 'full_name' => 'Ali Driver']);
        $route = Route::factory()->create([
            'tenant_id' => $tenantA->id,
            'name' => 'Route Z',
            'bus_id' => $bus->id,
            'driver_id' => $staff->id,
        ]);
        [, $parent] = $this->createParent($tenantA);
        Student::factory()->create([
            'tenant_id' => $tenantA->id,
            'parent_id' => $parent->id,
            'route_id' => $route->id,
            'full_name' => 'Ah Boy',
        ]);
        $this->createInvoiceForTenant($tenantA, ['final_amount' => 200, 'status' => 'paid']);
        $this->createInvoiceForTenant($tenantA, ['final_amount' => 100, 'status' => 'issued']);

        // Noise from another tenant that must never leak into Alpha's breakdown.
        Bus::factory()->create(['tenant_id' => $tenantB->id]);

        $response = $this->actingAs($admin)->getJson("/api/admin/operators/{$tenantA->id}");

        // createInvoiceForTenant spawns its own parent/student per call, so Alpha
        // ends up with 3 students total (Ah Boy + one per invoice) — only the
        // fleet/staff/route counts stay at exactly 1 since those were seeded directly.
        $response->assertOk()
            ->assertJsonCount(1, 'buses')
            ->assertJsonPath('buses.0.plate_number', 'ABC1234')
            ->assertJsonCount(1, 'staff')
            ->assertJsonPath('staff.0.full_name', 'Ali Driver')
            ->assertJsonCount(1, 'routes')
            ->assertJsonPath('routes.0.name', 'Route Z')
            ->assertJsonCount(3, 'students')
            ->assertJsonPath('finance_summary.total_expected', 300)
            ->assertJsonPath('finance_summary.total_collected', 200)
            ->assertJsonPath('finance_summary.total_outstanding', 100);
        $this->assertContains('Ah Boy', collect($response->json('students'))->pluck('full_name'));
    }

    public function test_operator_staff_cannot_list_operators(): void
    {
        $tenant = $this->createTenant();
        $staff = $this->createOperatorStaff($tenant);

        $this->actingAs($staff)->getJson('/api/admin/operators')->assertStatus(403);
    }
}
