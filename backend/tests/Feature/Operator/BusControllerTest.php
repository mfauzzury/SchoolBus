<?php

namespace Tests\Feature\Operator;

use App\Models\Bus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class BusControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    public function test_admin_can_create_a_bus(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        $response = $this->actingAs($admin)->postJson('/api/operator/buses', [
            'plate_number' => 'WXX1234',
            'capacity' => 40,
        ]);

        $response->assertCreated()->assertJsonPath('plate_number', 'WXX1234');
        $this->assertDatabaseHas('buses', ['plate_number' => 'WXX1234', 'tenant_id' => $tenant->id]);
    }

    public function test_creating_a_bus_requires_plate_number_and_capacity(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        $this->actingAs($admin)->postJson('/api/operator/buses', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['plate_number', 'capacity']);
    }

    public function test_admin_can_update_a_bus(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $bus = Bus::factory()->create(['tenant_id' => $tenant->id, 'capacity' => 30]);

        $this->actingAs($admin)->putJson("/api/operator/buses/{$bus->id}", ['capacity' => 45])
            ->assertOk()
            ->assertJsonPath('capacity', 45);
    }

    public function test_admin_can_delete_a_bus(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $bus = Bus::factory()->create(['tenant_id' => $tenant->id]);

        $this->actingAs($admin)->deleteJson("/api/operator/buses/{$bus->id}")->assertStatus(204);
        $this->assertDatabaseMissing('buses', ['id' => $bus->id]);
    }

    public function test_staff_can_list_buses_but_not_create_one(): void
    {
        $tenant = $this->createTenant();
        $staff = $this->createOperatorStaff($tenant);
        Bus::factory()->create(['tenant_id' => $tenant->id]);

        $this->actingAs($staff)->getJson('/api/operator/buses')->assertOk();

        $this->actingAs($staff)->postJson('/api/operator/buses', ['plate_number' => 'X', 'capacity' => 10])
            ->assertStatus(403);
    }

    public function test_staff_cannot_update_or_delete_a_bus(): void
    {
        $tenant = $this->createTenant();
        $staff = $this->createOperatorStaff($tenant);
        $bus = Bus::factory()->create(['tenant_id' => $tenant->id]);

        $this->actingAs($staff)->putJson("/api/operator/buses/{$bus->id}", ['capacity' => 99])
            ->assertStatus(403);

        $this->actingAs($staff)->deleteJson("/api/operator/buses/{$bus->id}")
            ->assertStatus(403);
    }

    public function test_a_parent_cannot_access_operator_bus_endpoints(): void
    {
        $tenant = $this->createTenant();
        [$parentUser] = $this->createParent($tenant);

        $this->actingAs($parentUser)->getJson('/api/operator/buses')->assertStatus(403);
    }
}
