<?php

namespace Tests\Feature;

use App\Models\Bus;
use App\Models\Invoice;
use App\Models\Route;
use App\Models\Staff;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

/**
 * Cross-tenant data leakage is the single most important thing to get right
 * in a multi-tenant SaaS — a bug here means one customer sees another's data.
 */
class TenantIsolationTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    public function test_operator_cannot_list_another_tenants_buses(): void
    {
        $tenantA = $this->createTenant();
        $tenantB = $this->createTenant();
        $adminA = $this->createOperatorAdmin($tenantA);

        Bus::factory()->create(['tenant_id' => $tenantA->id, 'plate_number' => 'MINE-1']);
        Bus::factory()->create(['tenant_id' => $tenantB->id, 'plate_number' => 'THEIRS-1']);

        $response = $this->actingAs($adminA)->getJson('/api/operator/buses');

        $response->assertOk();
        $plates = collect($response->json())->pluck('plate_number');
        $this->assertTrue($plates->contains('MINE-1'));
        $this->assertFalse($plates->contains('THEIRS-1'));
    }

    public function test_operator_cannot_fetch_another_tenants_bus_by_id(): void
    {
        $tenantA = $this->createTenant();
        $tenantB = $this->createTenant();
        $adminA = $this->createOperatorAdmin($tenantA);
        $otherBus = Bus::factory()->create(['tenant_id' => $tenantB->id]);

        $this->actingAs($adminA)->getJson("/api/operator/buses/{$otherBus->id}")
            ->assertStatus(404);
    }

    public function test_operator_cannot_update_another_tenants_bus(): void
    {
        $tenantA = $this->createTenant();
        $tenantB = $this->createTenant();
        $adminA = $this->createOperatorAdmin($tenantA);
        $otherBus = Bus::factory()->create(['tenant_id' => $tenantB->id, 'plate_number' => 'ORIGINAL']);

        $this->actingAs($adminA)
            ->putJson("/api/operator/buses/{$otherBus->id}", ['plate_number' => 'HACKED', 'capacity' => 30])
            ->assertStatus(404);

        $this->assertSame('ORIGINAL', $otherBus->fresh()->plate_number);
    }

    public function test_operator_cannot_delete_another_tenants_bus(): void
    {
        $tenantA = $this->createTenant();
        $tenantB = $this->createTenant();
        $adminA = $this->createOperatorAdmin($tenantA);
        $otherBus = Bus::factory()->create(['tenant_id' => $tenantB->id]);

        $this->actingAs($adminA)->deleteJson("/api/operator/buses/{$otherBus->id}")
            ->assertStatus(404);

        $this->assertDatabaseHas('buses', ['id' => $otherBus->id]);
    }

    public function test_staff_and_routes_are_isolated_across_tenants(): void
    {
        $tenantA = $this->createTenant();
        $tenantB = $this->createTenant();
        $adminA = $this->createOperatorAdmin($tenantA);

        Staff::factory()->create(['tenant_id' => $tenantA->id, 'full_name' => 'Mine']);
        Staff::factory()->create(['tenant_id' => $tenantB->id, 'full_name' => 'Theirs']);
        Route::factory()->create(['tenant_id' => $tenantA->id, 'name' => 'My Route']);
        Route::factory()->create(['tenant_id' => $tenantB->id, 'name' => 'Their Route']);

        $staffNames = collect($this->actingAs($adminA)->getJson('/api/operator/staff')->json())->pluck('full_name');
        $routeNames = collect($this->actingAs($adminA)->getJson('/api/operator/routes')->json())->pluck('name');

        $this->assertEqualsCanonicalizing(['Mine'], $staffNames->all());
        $this->assertEqualsCanonicalizing(['My Route'], $routeNames->all());
    }

    public function test_operator_students_and_invoices_are_isolated(): void
    {
        $tenantA = $this->createTenant();
        $tenantB = $this->createTenant();
        $adminA = $this->createOperatorAdmin($tenantA);

        [, $parentA] = $this->createParent($tenantA);
        [, $parentB] = $this->createParent($tenantB);
        $studentA = Student::factory()->create(['tenant_id' => $tenantA->id, 'parent_id' => $parentA->id, 'full_name' => 'Mine']);
        $studentB = Student::factory()->create(['tenant_id' => $tenantB->id, 'parent_id' => $parentB->id, 'full_name' => 'Theirs']);
        Invoice::factory()->create(['tenant_id' => $tenantA->id, 'student_id' => $studentA->id]);
        Invoice::factory()->create(['tenant_id' => $tenantB->id, 'student_id' => $studentB->id]);

        $students = collect($this->actingAs($adminA)->getJson('/api/operator/students')->json())->pluck('full_name');
        $invoices = $this->actingAs($adminA)->getJson('/api/operator/invoices')->json();

        $this->assertEqualsCanonicalizing(['Mine'], $students->all());
        $this->assertCount(1, $invoices);
        $this->assertSame($studentA->id, $invoices[0]['student_id']);
    }

    public function test_a_parent_cannot_see_another_parents_children(): void
    {
        $tenant = $this->createTenant();
        [$userA, $parentA] = $this->createParent($tenant);
        [, $parentB] = $this->createParent($tenant);

        Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parentA->id, 'full_name' => 'MyChild']);
        Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parentB->id, 'full_name' => 'NotMyChild']);

        $names = collect($this->actingAs($userA)->getJson('/api/parent/students')->json())->pluck('full_name');

        $this->assertEqualsCanonicalizing(['MyChild'], $names->all());
    }

    public function test_tenant_scoped_creates_auto_assign_the_authenticated_users_tenant(): void
    {
        $tenantA = $this->createTenant();
        $tenantB = $this->createTenant();
        $adminA = $this->createOperatorAdmin($tenantA);
        $this->createOperatorAdmin($tenantB); // ensures tenant B exists and isn't accidentally empty

        $response = $this->actingAs($adminA)->postJson('/api/operator/buses', [
            'plate_number' => 'NEW-1',
            'capacity' => 30,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('buses', ['plate_number' => 'NEW-1', 'tenant_id' => $tenantA->id]);
    }
}
