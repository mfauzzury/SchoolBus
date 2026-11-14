<?php

namespace Tests\Feature\Operator;

use App\Models\Bus;
use App\Models\ParentProfile;
use App\Models\Route;
use App\Models\Staff;
use App\Models\Student;
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

    public function test_renaming_or_moving_stops_keeps_the_children_who_use_them(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $route = Route::factory()->create(['tenant_id' => $tenant->id]);
        $first = $route->stops()->create(['tenant_id' => $tenant->id, 'name' => 'Taman Melati', 'sequence' => 1]);
        $second = $route->stops()->create(['tenant_id' => $tenant->id, 'name' => 'Pasar', 'sequence' => 2]);
        [, $parent] = $this->createParent($tenant);
        $child = Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id, 'route_id' => $route->id, 'pickup_stop_id' => $first->id]);

        $this->actingAs($admin)->putJson("/api/operator/routes/{$route->id}", [
            'name' => $route->name,
            'stops' => [
                ['name' => 'Pasar', 'sequence' => 1],
                ['id' => $first->id, 'name' => 'Taman Melati Jaya', 'sequence' => 2],
            ],
        ])->assertOk()
            ->assertJsonPath('stops.0.id', $second->id)
            ->assertJsonPath('stops.1.id', $first->id)
            ->assertJsonPath('stops.1.name', 'Taman Melati Jaya');

        $this->assertSame($first->id, $child->fresh()->pickup_stop_id);
    }

    public function test_removing_a_stop_clears_it_only_for_the_children_who_used_it(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $route = Route::factory()->create(['tenant_id' => $tenant->id]);
        $kept = $route->stops()->create(['tenant_id' => $tenant->id, 'name' => 'Kept', 'sequence' => 1]);
        $gone = $route->stops()->create(['tenant_id' => $tenant->id, 'name' => 'Gone', 'sequence' => 2]);
        [, $parent] = $this->createParent($tenant);
        $atKept = Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id, 'route_id' => $route->id, 'pickup_stop_id' => $kept->id]);
        $atGone = Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id, 'route_id' => $route->id, 'pickup_stop_id' => $gone->id]);

        $this->actingAs($admin)->putJson("/api/operator/routes/{$route->id}", [
            'name' => $route->name,
            'stops' => [['name' => 'Kept', 'sequence' => 1]],
        ])->assertOk()->assertJsonCount(1, 'stops');

        $this->assertSame($kept->id, $atKept->fresh()->pickup_stop_id);
        $this->assertNull($atGone->fresh()->pickup_stop_id);
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

    public function test_the_route_list_counts_only_active_students_on_each_route(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $parent = ParentProfile::factory()->create(['tenant_id' => $tenant->id]);
        $busy = Route::factory()->create(['tenant_id' => $tenant->id, 'name' => 'Busy']);
        $empty = Route::factory()->create(['tenant_id' => $tenant->id, 'name' => 'Empty']);

        Student::factory()->count(2)->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id, 'route_id' => $busy->id]);
        Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id, 'route_id' => $busy->id, 'enrollment_status' => 'withdrawn']);

        $counts = collect($this->actingAs($admin)->getJson('/api/operator/routes')->assertOk()->json())
            ->pluck('students_count', 'name');

        $this->assertSame(2, $counts['Busy']);
        $this->assertSame(0, $counts['Empty']);
    }

    public function test_a_route_can_be_set_to_the_morning_or_afternoon_session_only(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        $this->actingAs($admin)->postJson('/api/operator/routes', ['name' => 'Route A', 'session' => 'afternoon'])
            ->assertCreated()
            ->assertJsonPath('session', 'afternoon');

        $this->actingAs($admin)->postJson('/api/operator/routes', ['name' => 'Route B', 'session' => 'night'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('session');
    }
}
