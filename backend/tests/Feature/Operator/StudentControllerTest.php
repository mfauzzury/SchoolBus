<?php

namespace Tests\Feature\Operator;

use App\Models\Route;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class StudentControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    public function test_list_includes_parent_route_and_latest_invoice(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        [, $parent] = $this->createParent($tenant, [], ['full_name' => 'Jane Parent']);
        $route = Route::factory()->create(['tenant_id' => $tenant->id, 'name' => 'Route A']);
        Student::factory()->create([
            'tenant_id' => $tenant->id,
            'parent_id' => $parent->id,
            'route_id' => $route->id,
            'full_name' => 'Kiddo',
        ]);

        $response = $this->actingAs($admin)->getJson('/api/operator/students');

        $response->assertOk()->assertJsonCount(1)
            ->assertJsonPath('0.full_name', 'Kiddo')
            ->assertJsonPath('0.parent_profile.full_name', 'Jane Parent')
            ->assertJsonPath('0.route.name', 'Route A');
    }

    public function test_list_can_be_filtered_by_enrollment_status(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        [, $parent] = $this->createParent($tenant);
        Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id, 'enrollment_status' => 'active']);
        Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id, 'enrollment_status' => 'withdrawn']);

        $response = $this->actingAs($admin)->getJson('/api/operator/students?status=withdrawn');

        $response->assertOk()->assertJsonCount(1)->assertJsonPath('0.enrollment_status', 'withdrawn');
    }

    public function test_staff_can_view_students(): void
    {
        $tenant = $this->createTenant();
        $staff = $this->createOperatorStaff($tenant);

        $this->actingAs($staff)->getJson('/api/operator/students')->assertOk();
    }
}
