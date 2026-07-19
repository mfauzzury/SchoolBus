<?php

namespace Tests\Feature\Operator;

use App\Models\Route;
use App\Models\StudentApplication;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class StudentApplicationControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    public function test_operator_can_list_pending_applications(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        [, $parent] = $this->createParent($tenant, [], ['full_name' => 'Jane Parent']);
        StudentApplication::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id, 'status' => 'pending']);
        StudentApplication::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id, 'status' => 'approved']);

        $response = $this->actingAs($admin)->getJson('/api/operator/student-applications?status=pending');

        $response->assertOk()->assertJsonCount(1)->assertJsonPath('0.status', 'pending');
    }

    public function test_approving_an_application_creates_a_student_and_issues_an_invoice(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        [, $parent] = $this->createParent($tenant);
        $route = Route::factory()->create(['tenant_id' => $tenant->id, 'base_monthly_fee' => 150]);
        $application = StudentApplication::factory()->create([
            'tenant_id' => $tenant->id,
            'parent_id' => $parent->id,
            'full_name' => 'Child One',
            'school_name' => 'Requested School',
        ]);

        $response = $this->actingAs($admin)->postJson("/api/operator/student-applications/{$application->id}/approve", [
            'route_id' => $route->id,
            'school_name' => 'SK Demo',
        ]);

        $response->assertOk()->assertJsonPath('status', 'approved');
        $this->assertDatabaseHas('students', [
            'full_name' => 'Child One',
            'school_name' => 'SK Demo',
            'route_id' => $route->id,
            'enrollment_status' => 'active',
        ]);
        $student = \App\Models\Student::where('full_name', 'Child One')->firstOrFail();
        $invoice = $student->invoices()->firstOrFail();
        $this->assertSame('issued', $invoice->status->value);
        $this->assertEquals(150.0, (float) $invoice->final_amount);
        $this->assertSame($student->id, $application->fresh()->resulting_student_id);
    }

    public function test_approving_a_second_childs_application_applies_the_sibling_discount(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        [, $parent] = $this->createParent($tenant);
        $route = Route::factory()->create(['tenant_id' => $tenant->id, 'base_monthly_fee' => 100]);

        $approve = function (string $name) use ($admin, $tenant, $parent, $route) {
            $application = StudentApplication::factory()->create([
                'tenant_id' => $tenant->id,
                'parent_id' => $parent->id,
                'full_name' => $name,
            ]);

            return $this->actingAs($admin)->postJson("/api/operator/student-applications/{$application->id}/approve", [
                'route_id' => $route->id,
                'school_name' => 'SK Demo',
            ]);
        };

        $approve('Child One');
        $approve('Child Two');

        $firstInvoice = \App\Models\Student::where('full_name', 'Child One')->firstOrFail()->invoices()->firstOrFail();
        $secondInvoice = \App\Models\Student::where('full_name', 'Child Two')->firstOrFail()->invoices()->firstOrFail();

        $this->assertEquals(100.0, (float) $firstInvoice->final_amount);
        $this->assertEquals(90.0, (float) $secondInvoice->final_amount); // 10% sibling discount
    }

    public function test_fee_override_is_used_instead_of_the_routes_base_fee(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        [, $parent] = $this->createParent($tenant);
        $route = Route::factory()->create(['tenant_id' => $tenant->id, 'base_monthly_fee' => 150]);
        $application = StudentApplication::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id]);

        $this->actingAs($admin)->postJson("/api/operator/student-applications/{$application->id}/approve", [
            'route_id' => $route->id,
            'school_name' => 'SK Demo',
            'fee_override' => 80,
        ])->assertOk();

        $student = \App\Models\Student::first();
        $this->assertEquals(80.0, (float) $student->fee_override);
        $this->assertEquals(80.0, (float) $student->invoices()->firstOrFail()->final_amount);
    }

    public function test_cannot_approve_with_another_tenants_route(): void
    {
        $tenantA = $this->createTenant();
        $tenantB = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenantA);
        [, $parent] = $this->createParent($tenantA);
        $application = StudentApplication::factory()->create(['tenant_id' => $tenantA->id, 'parent_id' => $parent->id]);
        $otherRoute = Route::factory()->create(['tenant_id' => $tenantB->id]);

        $response = $this->actingAs($admin)->postJson("/api/operator/student-applications/{$application->id}/approve", [
            'route_id' => $otherRoute->id,
            'school_name' => 'SK Demo',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['route_id']);
        $this->assertDatabaseMissing('students', ['tenant_id' => $tenantA->id]);
    }

    public function test_pickup_stop_must_belong_to_the_selected_route(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        [, $parent] = $this->createParent($tenant);
        $route = Route::factory()->create(['tenant_id' => $tenant->id, 'base_monthly_fee' => 100]);
        $otherRoute = Route::factory()->create(['tenant_id' => $tenant->id]);
        $stopOnOtherRoute = $otherRoute->stops()->create(['tenant_id' => $tenant->id, 'name' => 'Stop X', 'sequence' => 1]);
        $application = StudentApplication::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id]);

        $response = $this->actingAs($admin)->postJson("/api/operator/student-applications/{$application->id}/approve", [
            'route_id' => $route->id,
            'school_name' => 'SK Demo',
            'pickup_stop_id' => $stopOnOtherRoute->id,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['pickup_stop_id']);
    }

    public function test_rejecting_an_application_records_the_reason_and_creates_no_student(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        [, $parent] = $this->createParent($tenant);
        $application = StudentApplication::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id, 'full_name' => 'Child One']);

        $response = $this->actingAs($admin)->postJson("/api/operator/student-applications/{$application->id}/reject", [
            'rejection_reason' => 'No seats available.',
        ]);

        $response->assertOk()->assertJsonPath('status', 'rejected')->assertJsonPath('rejection_reason', 'No seats available.');
        $this->assertDatabaseMissing('students', ['full_name' => 'Child One']);
    }

    public function test_rejecting_an_application_requires_a_reason(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        [, $parent] = $this->createParent($tenant);
        $application = StudentApplication::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id]);

        $this->actingAs($admin)->postJson("/api/operator/student-applications/{$application->id}/reject", [])
            ->assertStatus(422)->assertJsonValidationErrors(['rejection_reason']);
    }

    public function test_cannot_review_an_application_twice(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        [, $parent] = $this->createParent($tenant);
        $application = StudentApplication::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id, 'status' => 'rejected']);

        $this->actingAs($admin)->postJson("/api/operator/student-applications/{$application->id}/reject", [
            'rejection_reason' => 'Second attempt.',
        ])->assertStatus(422);
    }

    public function test_staff_can_view_but_not_approve_applications(): void
    {
        $tenant = $this->createTenant();
        $staff = $this->createOperatorStaff($tenant);
        [, $parent] = $this->createParent($tenant);
        $route = Route::factory()->create(['tenant_id' => $tenant->id, 'base_monthly_fee' => 100]);
        $application = StudentApplication::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id]);

        $this->actingAs($staff)->getJson('/api/operator/student-applications')->assertOk();
        $this->actingAs($staff)->postJson("/api/operator/student-applications/{$application->id}/approve", [
            'route_id' => $route->id,
            'school_name' => 'SK Demo',
        ])->assertStatus(403);
    }

    public function test_admin_cannot_approve_another_tenants_application(): void
    {
        $tenantA = $this->createTenant();
        $tenantB = $this->createTenant();
        $adminA = $this->createOperatorAdmin($tenantA);
        [, $parentB] = $this->createParent($tenantB);
        $route = Route::factory()->create(['tenant_id' => $tenantB->id, 'base_monthly_fee' => 100]);
        $otherApplication = StudentApplication::factory()->create(['tenant_id' => $tenantB->id, 'parent_id' => $parentB->id]);

        $this->actingAs($adminA)->postJson("/api/operator/student-applications/{$otherApplication->id}/approve", [
            'route_id' => $route->id,
            'school_name' => 'SK Demo',
        ])->assertStatus(404);
    }
}
