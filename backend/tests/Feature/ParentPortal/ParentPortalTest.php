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

    public function test_enrolling_a_child_creates_the_student_and_an_issued_invoice(): void
    {
        $tenant = $this->createTenant();
        [$parentUser] = $this->createParent($tenant);
        $route = Route::factory()->create(['tenant_id' => $tenant->id, 'base_monthly_fee' => 150]);

        $response = $this->actingAs($parentUser)->postJson('/api/parent/students', [
            'full_name' => 'Child One',
            'date_of_birth' => '2015-01-01',
            'school_name' => 'SK Demo',
            'route_id' => $route->id,
            'package_type' => 'return',
            'billing_period' => 'monthly',
        ]);

        $response->assertCreated()
            ->assertJsonPath('full_name', 'Child One')
            ->assertJsonPath('invoices.0.status', 'issued');
        $this->assertEquals(150.0, $response->json('invoices.0.final_amount'));
    }

    public function test_enrolling_a_second_child_applies_the_sibling_discount(): void
    {
        $tenant = $this->createTenant();
        [$parentUser] = $this->createParent($tenant);
        $route = Route::factory()->create(['tenant_id' => $tenant->id, 'base_monthly_fee' => 100]);

        $enroll = fn (string $name) => $this->actingAs($parentUser)->postJson('/api/parent/students', [
            'full_name' => $name,
            'date_of_birth' => '2015-01-01',
            'school_name' => 'SK Demo',
            'route_id' => $route->id,
            'package_type' => 'return',
            'billing_period' => 'monthly',
        ]);

        $first = $enroll('Child One');
        $second = $enroll('Child Two');

        $this->assertEquals(100.0, $first->json('invoices.0.final_amount'));
        $this->assertEquals(90.0, $second->json('invoices.0.final_amount')); // 10% sibling discount
    }

    public function test_cannot_enroll_a_child_on_another_tenants_route(): void
    {
        $tenantA = $this->createTenant();
        $tenantB = $this->createTenant();
        [$parentUser] = $this->createParent($tenantA);
        $otherRoute = Route::factory()->create(['tenant_id' => $tenantB->id]);

        $response = $this->actingAs($parentUser)->postJson('/api/parent/students', [
            'full_name' => 'Child One',
            'date_of_birth' => '2015-01-01',
            'school_name' => 'SK Demo',
            'route_id' => $otherRoute->id,
            'package_type' => 'return',
            'billing_period' => 'monthly',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['route_id']);
        $this->assertDatabaseMissing('students', ['full_name' => 'Child One']);
    }

    public function test_pickup_stop_must_belong_to_the_selected_route(): void
    {
        $tenant = $this->createTenant();
        [$parentUser] = $this->createParent($tenant);
        $route = Route::factory()->create(['tenant_id' => $tenant->id, 'base_monthly_fee' => 100]);
        $otherRoute = Route::factory()->create(['tenant_id' => $tenant->id]);
        $stopOnOtherRoute = $otherRoute->stops()->create(['tenant_id' => $tenant->id, 'name' => 'Stop X', 'sequence' => 1]);

        $response = $this->actingAs($parentUser)->postJson('/api/parent/students', [
            'full_name' => 'Child One',
            'date_of_birth' => '2015-01-01',
            'school_name' => 'SK Demo',
            'route_id' => $route->id,
            'pickup_stop_id' => $stopOnOtherRoute->id,
            'package_type' => 'return',
            'billing_period' => 'monthly',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['pickup_stop_id']);
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
