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

    public function test_model_and_engine_capacity_are_saved_and_returned(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        $this->actingAs($admin)->postJson('/api/operator/buses', [
            'plate_number' => 'WXX 1234',
            'capacity' => 40,
            'model' => 'Hino RK1J',
            'engine_capacity' => 7684,
        ])->assertCreated()
            ->assertJsonPath('model', 'Hino RK1J')
            ->assertJsonPath('engine_capacity', 7684);

        $this->actingAs($admin)->getJson('/api/operator/buses')
            ->assertJsonPath('0.model', 'Hino RK1J')
            ->assertJsonPath('0.engine_capacity', 7684);
    }

    public function test_model_and_engine_capacity_are_optional_and_can_be_cleared(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $bus = Bus::factory()->create([
            'tenant_id' => $tenant->id, 'model' => 'Toyota Coaster', 'engine_capacity' => 4000,
        ]);

        // A bus without them is fine.
        $this->actingAs($admin)->postJson('/api/operator/buses', ['plate_number' => 'ABC 1', 'capacity' => 20])
            ->assertCreated()->assertJsonPath('model', null)->assertJsonPath('engine_capacity', null);

        // Leaving them out of an update keeps what is stored...
        $this->actingAs($admin)->putJson("/api/operator/buses/{$bus->id}", ['capacity' => 30])->assertOk();
        $this->assertSame('Toyota Coaster', $bus->fresh()->model);
        $this->assertSame(4000, $bus->fresh()->engine_capacity);

        // ...and sending them blank clears them.
        $this->actingAs($admin)->putJson("/api/operator/buses/{$bus->id}", ['model' => '', 'engine_capacity' => null])
            ->assertOk();
        $this->assertNull($bus->fresh()->model);
        $this->assertNull($bus->fresh()->engine_capacity);
    }

    public function test_engine_capacity_must_be_a_sensible_whole_number_of_cc(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $base = ['plate_number' => 'ABC 1', 'capacity' => 20];

        foreach ([0, -5, 100000, 'big', 7.5] as $bad) {
            $this->actingAs($admin)->postJson('/api/operator/buses', [...$base, 'engine_capacity' => $bad])
                ->assertStatus(422)->assertJsonValidationErrors('engine_capacity');
        }

        $this->actingAs($admin)->postJson('/api/operator/buses', [...$base, 'model' => str_repeat('x', 101)])
            ->assertStatus(422)->assertJsonValidationErrors('model');
    }

    public function test_staff_cannot_set_model_or_engine_capacity(): void
    {
        $tenant = $this->createTenant();
        $staff = $this->createOperatorStaff($tenant);
        $bus = Bus::factory()->create(['tenant_id' => $tenant->id]);

        $this->actingAs($staff)->putJson("/api/operator/buses/{$bus->id}", ['model' => 'Hacked'])->assertForbidden();
    }
}
