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

    public function test_student_page_shows_the_details_a_parent_filled_in(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $student = $this->createBillableStudent($tenant, [
            'gender' => 'female',
            'teacher_name' => 'Cikgu Aminah',
            'class_name' => '3 Bestari',
            'school_phone' => '03-1234 5678',
        ]);

        $this->actingAs($admin)->getJson("/api/operator/students/{$student->id}")
            ->assertOk()
            ->assertJsonPath('gender', 'female')
            ->assertJsonPath('teacher_name', 'Cikgu Aminah')
            ->assertJsonPath('class_name', '3 Bestari')
            ->assertJsonPath('school_phone', '03-1234 5678')
            ->assertJsonPath('avatar_url', null);
    }

    public function test_admin_can_set_and_clear_a_students_custom_monthly_fee(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $student = $this->createBillableStudent($tenant);

        $this->actingAs($admin)->putJson("/api/operator/students/{$student->id}", ['fee_override' => 95.5])
            ->assertOk()
            ->assertJsonPath('fee_override', '95.50');
        $this->assertEquals(95.5, $student->fresh()->monthlyFee());

        $this->actingAs($admin)->putJson("/api/operator/students/{$student->id}", ['fee_override' => null])
            ->assertOk()
            ->assertJsonPath('fee_override', null);
        $this->assertEquals(150.0, $student->fresh()->monthlyFee());
    }

    public function test_admin_can_suspend_a_student_without_touching_their_fee(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $student = $this->createBillableStudent($tenant, ['fee_override' => 80]);

        $this->actingAs($admin)->putJson("/api/operator/students/{$student->id}", ['enrollment_status' => 'suspended'])
            ->assertOk()
            ->assertJsonPath('enrollment_status', 'suspended')
            ->assertJsonPath('fee_override', '80.00');

        $this->actingAs($admin)->putJson("/api/operator/students/{$student->id}", ['enrollment_status' => 'expelled'])
            ->assertStatus(422);
    }

    public function test_staff_cannot_change_a_students_billing(): void
    {
        $tenant = $this->createTenant();
        $staff = $this->createOperatorStaff($tenant);
        $student = $this->createBillableStudent($tenant);

        $this->actingAs($staff)->putJson("/api/operator/students/{$student->id}", ['fee_override' => 1])->assertStatus(403);
    }

    public function test_admin_cannot_change_another_tenants_student(): void
    {
        $admin = $this->createOperatorAdmin($this->createTenant());
        $otherStudent = $this->createBillableStudent($this->createTenant());

        $this->actingAs($admin)->putJson("/api/operator/students/{$otherStudent->id}", ['fee_override' => 1])->assertStatus(404);
        $this->assertNull($otherStudent->fresh()->fee_override);
    }

    public function test_staff_can_open_a_student_with_parent_route_and_siblings(): void
    {
        $tenant = $this->createTenant();
        $staff = $this->createOperatorStaff($tenant);
        [, $parent] = $this->createParent($tenant, [], ['full_name' => 'Jane Parent', 'emergency_contact_name' => 'Uncle Bob']);
        $route = Route::factory()->create(['tenant_id' => $tenant->id, 'name' => 'Route A']);
        $kid = Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id, 'route_id' => $route->id, 'full_name' => 'Kid One']);
        Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id, 'full_name' => 'Kid Two']);

        $this->actingAs($staff)->getJson("/api/operator/students/{$kid->id}")
            ->assertOk()
            ->assertJsonPath('full_name', 'Kid One')
            ->assertJsonPath('route.name', 'Route A')
            ->assertJsonPath('parent_profile.full_name', 'Jane Parent')
            ->assertJsonPath('parent_profile.emergency_contact_name', 'Uncle Bob')
            ->assertJsonCount(1, 'siblings')
            ->assertJsonPath('siblings.0.full_name', 'Kid Two');
    }

    public function test_cannot_open_another_tenants_student(): void
    {
        $admin = $this->createOperatorAdmin($this->createTenant());
        $otherStudent = $this->createBillableStudent($this->createTenant());

        $this->actingAs($admin)->getJson("/api/operator/students/{$otherStudent->id}")->assertStatus(404);
    }

    public function test_admin_can_set_the_billing_window_and_clear_it(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $student = $this->createBillableStudent($tenant);

        $this->actingAs($admin)->putJson("/api/operator/students/{$student->id}", [
            'billing_starts_on' => '2026-03',
            'billing_ends_on' => '2026-11',
        ])->assertOk();

        $student->refresh();
        $this->assertSame('2026-03-01', $student->billing_starts_on->toDateString());
        $this->assertSame('2026-11-01', $student->billing_ends_on->toDateString());

        $this->actingAs($admin)->putJson("/api/operator/students/{$student->id}", ['billing_ends_on' => null])->assertOk();
        $this->assertNull($student->fresh()->billing_ends_on);
        $this->assertSame('2026-03-01', $student->fresh()->billing_starts_on->toDateString());
    }

    public function test_the_last_billed_month_cannot_be_before_the_first(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $student = $this->createBillableStudent($tenant, ['billing_starts_on' => '2026-06-01']);

        // Against the start already saved, when only one side is sent.
        $this->actingAs($admin)->putJson("/api/operator/students/{$student->id}", ['billing_ends_on' => '2026-05'])
            ->assertStatus(422)->assertJsonValidationErrors(['billing_ends_on']);

        $this->actingAs($admin)->putJson("/api/operator/students/{$student->id}", [
            'billing_starts_on' => '2026-09',
            'billing_ends_on' => '2026-08',
        ])->assertStatus(422)->assertJsonValidationErrors(['billing_ends_on']);

        $this->assertNull($student->fresh()->billing_ends_on);
    }

    public function test_the_billing_window_must_be_a_month(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $student = $this->createBillableStudent($tenant);

        $this->actingAs($admin)->putJson("/api/operator/students/{$student->id}", ['billing_starts_on' => 'next year'])
            ->assertStatus(422)->assertJsonValidationErrors(['billing_starts_on']);
    }

    public function test_the_student_page_says_what_the_next_bill_will_be(): void
    {
        $this->travelTo('2026-10-12 03:00:00');
        $tenant = $this->createTenant();
        $staff = $this->createOperatorStaff($tenant);
        $student = $this->createBillableStudent($tenant);

        $this->actingAs($staff)->getJson("/api/operator/students/{$student->id}")
            ->assertOk()
            ->assertJsonPath('next_bill.month', '2026-10-01')
            ->assertJsonPath('next_bill.due_date', '2026-10-19');

        $student->update(['enrollment_status' => 'suspended']);

        $this->actingAs($staff)->getJson("/api/operator/students/{$student->id}")
            ->assertOk()
            ->assertJsonPath('next_bill.reason', 'suspended');
    }
}
