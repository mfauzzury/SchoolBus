<?php

namespace Tests\Feature\Operator;

use App\Models\Staff;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class StaffControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    public function test_admin_can_create_a_driver(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        $response = $this->actingAs($admin)->postJson('/api/operator/staff', [
            'full_name' => 'Ali Bakar',
            'ic_number' => '900101-01-1234',
            'phone' => '0123456789',
            'role' => 'driver',
        ]);

        $response->assertCreated()->assertJsonPath('role', 'driver');
    }

    public function test_role_must_be_driver_or_conductor(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        $this->actingAs($admin)->postJson('/api/operator/staff', [
            'full_name' => 'Ali',
            'ic_number' => '1',
            'phone' => '1',
            'role' => 'pilot',
        ])->assertStatus(422)->assertJsonValidationErrors(['role']);
    }

    public function test_staff_list_can_be_filtered_by_role(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        Staff::factory()->driver()->create(['tenant_id' => $tenant->id, 'full_name' => 'Driver One']);
        Staff::factory()->conductor()->create(['tenant_id' => $tenant->id, 'full_name' => 'Conductor One']);

        $response = $this->actingAs($admin)->getJson('/api/operator/staff?role=driver');

        $response->assertOk();
        $names = collect($response->json())->pluck('full_name');
        $this->assertEqualsCanonicalizing(['Driver One'], $names->all());
    }

    public function test_admin_can_update_and_delete_staff(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $staff = Staff::factory()->create(['tenant_id' => $tenant->id, 'status' => 'active']);

        $this->actingAs($admin)->putJson("/api/operator/staff/{$staff->id}", ['status' => 'inactive'])
            ->assertOk()
            ->assertJsonPath('status', 'inactive');

        $this->actingAs($admin)->deleteJson("/api/operator/staff/{$staff->id}")->assertStatus(204);
        $this->assertDatabaseMissing('staff', ['id' => $staff->id]);
    }

    public function test_staff_role_cannot_write(): void
    {
        $tenant = $this->createTenant();
        $staffUser = $this->createOperatorStaff($tenant);

        $this->actingAs($staffUser)->postJson('/api/operator/staff', [
            'full_name' => 'X', 'ic_number' => '1', 'phone' => '1', 'role' => 'driver',
        ])->assertStatus(403);
    }
}
