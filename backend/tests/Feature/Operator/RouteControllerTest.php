<?php

namespace Tests\Feature\Operator;

use App\Models\Bus;
use App\Models\Route;
use App\Models\Staff;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class RouteControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    public function test_admin_can_create_a_route_with_stops_and_assignments(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $bus = Bus::factory()->create(['tenant_id' => $tenant->id]);
        $driver = Staff::factory()->driver()->create(['tenant_id' => $tenant->id]);

        $response = $this->actingAs($admin)->postJson('/api/operator/routes', [
            'name' => 'Route A',
            'zone' => 'North',
            'bus_id' => $bus->id,
            'driver_id' => $driver->id,
            'base_monthly_fee' => 150,
            'stops' => [
                ['name' => 'Stop 1', 'sequence' => 1],
                ['name' => 'Stop 2', 'sequence' => 2],
            ],
        ]);

        $response->assertCreated();
        $this->assertCount(2, $response->json('stops'));
        $this->assertSame($bus->id, $response->json('bus_id'));
        $this->assertSame('Stop 1', $response->json('stops.0.name'));
    }

    public function test_a_route_has_a_return_fee_and_a_separate_one_way_fee(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        $response = $this->actingAs($admin)->postJson('/api/operator/routes', [
            'name' => 'Route A',
            'base_monthly_fee' => 150,
            'one_way_monthly_fee' => 90,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('routes', ['name' => 'Route A', 'base_monthly_fee' => 150, 'one_way_monthly_fee' => 90]);

        $this->actingAs($admin)->putJson('/api/operator/routes/'.$response->json('id'), ['one_way_monthly_fee' => null])->assertOk();
        $this->assertDatabaseHas('routes', ['name' => 'Route A', 'one_way_monthly_fee' => null]);
    }

    public function test_a_route_cannot_be_assigned_a_bus_from_another_tenant(): void
    {
        $tenantA = $this->createTenant();
        $tenantB = $this->createTenant();
        $adminA = $this->createOperatorAdmin($tenantA);
        $otherBus = Bus::factory()->create(['tenant_id' => $tenantB->id]);

        $this->actingAs($adminA)->postJson('/api/operator/routes', [
            'name' => 'Route A',
            'bus_id' => $otherBus->id,
        ])->assertStatus(422)->assertJsonValidationErrors(['bus_id']);
    }

    public function test_updating_a_route_replaces_its_stops(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $route = Route::factory()->create(['tenant_id' => $tenant->id]);
        $route->stops()->create(['tenant_id' => $tenant->id, 'name' => 'Old Stop', 'sequence' => 1]);

        $response = $this->actingAs($admin)->putJson("/api/operator/routes/{$route->id}", [
            'name' => $route->name,
            'stops' => [['name' => 'New Stop', 'sequence' => 1]],
        ]);

        $response->assertOk();
        $this->assertCount(1, $response->json('stops'));
        $this->assertSame('New Stop', $response->json('stops.0.name'));
        $this->assertDatabaseMissing('route_stops', ['name' => 'Old Stop']);
    }

    public function test_omitting_stops_on_update_leaves_existing_stops_untouched(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $route = Route::factory()->create(['tenant_id' => $tenant->id, 'zone' => 'North']);
        $route->stops()->create(['tenant_id' => $tenant->id, 'name' => 'Keep Me', 'sequence' => 1]);

        $response = $this->actingAs($admin)->putJson("/api/operator/routes/{$route->id}", [
            'name' => $route->name,
            'zone' => 'South',
        ]);

        $response->assertOk()->assertJsonPath('zone', 'South');
        $this->assertDatabaseHas('route_stops', ['name' => 'Keep Me']);
    }

    public function test_pickup_stop_must_belong_to_the_selected_route_for_a_student(): void
    {
        // Covered end-to-end in ParentPortal tests; this asserts the route
        // resource itself exposes stops correctly for that validation to use.
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $route = Route::factory()->create(['tenant_id' => $tenant->id]);
        $route->stops()->create(['tenant_id' => $tenant->id, 'name' => 'Stop A', 'sequence' => 1]);

        $response = $this->actingAs($admin)->getJson("/api/operator/routes/{$route->id}");

        $response->assertOk()->assertJsonCount(1, 'stops');
    }
}
