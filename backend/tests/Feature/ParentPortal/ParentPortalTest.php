<?php

namespace Tests\Feature\ParentPortal;

use App\Models\Route;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class ParentPortalTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    public function test_parent_can_list_tenant_routes_with_stops(): void
    {
        $tenant = $this->createTenant();
        [$parentUser] = $this->createParent($tenant);
        $route = Route::factory()->create(['tenant_id' => $tenant->id, 'name' => 'Route A']);
        $route->stops()->create(['tenant_id' => $tenant->id, 'name' => 'Stop 1', 'sequence' => 1]);

        $response = $this->actingAs($parentUser)->getJson('/api/parent/routes');

        $response->assertOk()->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Route A')
            ->assertJsonCount(1, '0.stops');
    }

    public function test_quote_matches_the_spec_worked_example(): void
    {
        $tenant = $this->createTenant();
        [$parentUser] = $this->createParent($tenant);
        $route = Route::factory()->create(['tenant_id' => $tenant->id, 'base_monthly_fee' => 150]);

        // Route A, Return package, RM150/month, Yearly => RM150 x 12 x 0.85 = RM1,530
        $response = $this->actingAs($parentUser)->postJson('/api/parent/quote', [
            'route_id' => $route->id,
            'billing_period' => 'yearly',
        ]);

        $response->assertOk();
        $this->assertEquals(1800.0, $response->json('amount_before_discount'));
        $this->assertEquals(270.0, $response->json('discount_amount'));
        $this->assertEquals(1530.0, $response->json('final_amount'));
    }

    public function test_quote_rejects_a_route_id_belonging_to_another_tenant(): void
    {
        $tenantA = $this->createTenant();
        $tenantB = $this->createTenant();
        [$parentUser] = $this->createParent($tenantA);
        $otherRoute = Route::factory()->create(['tenant_id' => $tenantB->id, 'base_monthly_fee' => 100]);

        $this->actingAs($parentUser)->postJson('/api/parent/quote', [
            'route_id' => $otherRoute->id,
            'billing_period' => 'monthly',
        ])->assertStatus(422)->assertJsonValidationErrors(['route_id']);
    }

    public function test_submitting_an_application_creates_a_pending_application(): void
    {
        $tenant = $this->createTenant();
        [$parentUser] = $this->createParent($tenant);

        $response = $this->actingAs($parentUser)->postJson('/api/parent/student-applications', [
            'full_name' => 'Child One',
            'date_of_birth' => '2015-01-01',
            'school_name' => 'SK Demo',
            'package_type' => 'return',
            'billing_period' => 'monthly',
        ]);

        $response->assertCreated()
            ->assertJsonPath('full_name', 'Child One')
            ->assertJsonPath('status', 'pending');
        $this->assertDatabaseHas('student_applications', [
            'full_name' => 'Child One',
            'status' => 'pending',
            'route_id' => null,
        ]);
        $this->assertDatabaseMissing('students', ['full_name' => 'Child One']);
    }

    public function test_parent_can_list_their_applications(): void
    {
        $tenant = $this->createTenant();
        [$parentUser, $parent] = $this->createParent($tenant);
        \App\Models\StudentApplication::factory()->create([
            'tenant_id' => $tenant->id,
            'parent_id' => $parent->id,
            'full_name' => 'Applicant One',
        ]);

        $response = $this->actingAs($parentUser)->getJson('/api/parent/student-applications');

        $response->assertOk()->assertJsonCount(1)->assertJsonPath('0.full_name', 'Applicant One');
    }

    public function test_parent_can_list_their_invoices(): void
    {
        $tenant = $this->createTenant();
        [$parentUser, $parent] = $this->createParent($tenant);
        $route = Route::factory()->create(['tenant_id' => $tenant->id, 'base_monthly_fee' => 100]);
        $student = Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id, 'route_id' => $route->id]);
        \App\Models\Invoice::factory()->create(['tenant_id' => $tenant->id, 'student_id' => $student->id]);

        $response = $this->actingAs($parentUser)->getJson('/api/parent/invoices');

        $response->assertOk()->assertJsonCount(1);
    }

    public function test_an_operator_admin_cannot_access_parent_portal_endpoints(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        $this->actingAs($admin)->getJson('/api/parent/routes')->assertStatus(403);
        $this->actingAs($admin)->getJson('/api/parent/students')->assertStatus(403);
    }
}
