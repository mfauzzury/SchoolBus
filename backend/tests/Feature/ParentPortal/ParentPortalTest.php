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

    public function test_quote_prices_the_route_by_package_with_the_sibling_discount(): void
    {
        $tenant = $this->createTenant();
        [$parentUser, $parent] = $this->createParent($tenant);
        $route = Route::factory()->create(['tenant_id' => $tenant->id, 'base_monthly_fee' => 150, 'one_way_monthly_fee' => 90]);

        $this->actingAs($parentUser)->postJson('/api/parent/quote', ['route_id' => $route->id, 'package_type' => 'return'])
            ->assertOk()
            ->assertJsonPath('final_amount', 150);

        // With one child already enrolled, the next is the second: 10% off the one-way fee.
        Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id, 'route_id' => $route->id]);

        $response = $this->actingAs($parentUser)->postJson('/api/parent/quote', ['route_id' => $route->id, 'package_type' => 'one_way']);

        $response->assertOk();
        $this->assertEquals(90.0, $response->json('amount_before_discount'));
        $this->assertEquals(9.0, $response->json('discount_amount'));
        $this->assertEquals(81.0, $response->json('final_amount'));
    }

    public function test_quote_rejects_a_route_id_belonging_to_another_tenant(): void
    {
        $tenantA = $this->createTenant();
        $tenantB = $this->createTenant();
        [$parentUser] = $this->createParent($tenantA);
        $otherRoute = Route::factory()->create(['tenant_id' => $tenantB->id, 'base_monthly_fee' => 100]);

        $this->actingAs($parentUser)->postJson('/api/parent/quote', [
            'route_id' => $otherRoute->id,
            'package_type' => 'return',
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
        ]);

        $response->assertCreated()
            ->assertJsonPath('full_name', 'Child One')
            ->assertJsonPath('status', 'pending');
        $this->assertDatabaseHas('student_applications', [
            'full_name' => 'Child One',
            'status' => 'pending',
            'route_id' => null,
            'billing_period' => 'monthly',
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
        $invoice = \App\Models\Invoice::factory()->create(['tenant_id' => $tenant->id, 'student_id' => $student->id]);
        $invoice->payments()->create([
            'tenant_id' => $tenant->id,
            'method' => 'cash',
            'payment_date' => now()->toDateString(),
            'amount_paid' => 50,
        ]);

        $response = $this->actingAs($parentUser)->getJson('/api/parent/invoices');

        // Itemised, and what's owed is the balance — not the face value.
        $response->assertOk()->assertJsonCount(1)
            ->assertJsonCount(1, '0.items')
            ->assertJsonPath('0.items.0.type', 'fee')
            ->assertJsonPath('0.amount_paid', '50.00')
            ->assertJsonPath('0.balance', '100.00');
    }

    public function test_parent_never_sees_a_cancelled_bill(): void
    {
        $tenant = $this->createTenant();
        [$parentUser, $parent] = $this->createParent($tenant);
        $student = Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id]);
        \App\Models\Invoice::factory()->create([
            'tenant_id' => $tenant->id,
            'student_id' => $student->id,
            'status' => \App\Enums\InvoiceStatus::Void,
        ]);

        $this->actingAs($parentUser)->getJson('/api/parent/invoices')->assertOk()->assertJsonCount(0);
    }

    public function test_an_operator_admin_cannot_access_parent_portal_endpoints(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        $this->actingAs($admin)->getJson('/api/parent/routes')->assertStatus(403);
        $this->actingAs($admin)->getJson('/api/parent/students')->assertStatus(403);
    }
}
