<?php

namespace Tests\Feature\Transit;

use App\Models\BusOperator;
use App\Models\Route;
use App\Models\RouteStop;
use App\Models\Staff;
use App\Models\Student;
use App\Models\StudentExtra;
use App\Models\TransitCenter;
use App\Models\TransitRequest;
use App\Models\Trip;
use App\Models\User;
use App\Notifications\TransitPlanChanged;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

/**
 * Abu goes school → Bright Kids TC on route A (driver Ali) and TC → home on
 * route B (driver Siti, leaving the center at 18:00). What do the drivers,
 * the parent and the operator see?
 */
class TransitPlanViewsTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private BusOperator $tenant;

    private User $admin;

    private User $centerUser;

    private User $parentUser;

    private User $driverA;

    private Staff $staffA;

    private User $driverB;

    private Staff $staffB;

    private Route $routeA;

    private Route $routeB;

    private Student $abu;

    private int $planId;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->travelTo(now()->setTime(9, 0));

        $this->tenant = $this->createTenant();
        $this->admin = $this->createOperatorAdmin($this->tenant);
        [$this->driverA, $this->staffA] = $this->createDriver($this->tenant, [], ['full_name' => 'Ali', 'phone' => '011-111 1111']);
        [$this->driverB, $this->staffB] = $this->createDriver($this->tenant, [], ['full_name' => 'Siti', 'phone' => '012-222 2222']);
        $this->routeA = Route::factory()->create(['tenant_id' => $this->tenant->id, 'name' => 'Route A', 'driver_id' => $this->staffA->id]);
        $this->routeB = Route::factory()->create(['tenant_id' => $this->tenant->id, 'name' => 'Route B', 'driver_id' => $this->staffB->id]);
        $homeA = RouteStop::create(['tenant_id' => $this->tenant->id, 'route_id' => $this->routeA->id, 'name' => 'Taman Abu', 'sequence' => 1]);
        $homeB = RouteStop::create(['tenant_id' => $this->tenant->id, 'route_id' => $this->routeB->id, 'name' => 'Taman Abu', 'sequence' => 1]);

        $this->ensureRole('transit_center');
        $this->centerUser = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->centerUser->assignRole('transit_center');
        TransitCenter::create([
            'tenant_id' => $this->tenant->id, 'user_id' => $this->centerUser->id, 'name' => 'Bright Kids TC',
            'phone' => '03-555 0000', 'email' => $this->centerUser->email, 'status' => 'active',
        ]);

        [$this->parentUser, $parent] = $this->createParent($this->tenant);
        $this->abu = Student::factory()->create([
            'tenant_id' => $this->tenant->id, 'parent_id' => $parent->id, 'route_id' => $this->routeA->id,
            'pickup_stop_id' => $homeA->id, 'full_name' => 'Abu',
        ]);

        $this->planId = $this->actingAs($this->centerUser)->postJson('/api/transit/requests', [
            'student_id' => $this->abu->id,
            'legs' => ['school_to_center', 'center_to_home'],
            'starts_on' => today()->toDateString(),
            'leave_center_at' => '18:00',
        ])->assertCreated()->json('id');

        $this->actingAs($this->admin)->postJson("/api/operator/transit-requests/{$this->planId}/approve", [
            'monthly_amount' => 90,
            'starts_on' => today()->toDateString(),
            'legs' => [
                ['leg' => 'school_to_center', 'route_id' => $this->routeA->id, 'center_after_stop_id' => $homeA->id],
                ['leg' => 'center_to_home', 'route_id' => $this->routeB->id, 'center_after_stop_id' => null, 'home_stop_id' => $homeB->id],
            ],
        ])->assertOk();
    }

    private function roster(User $driver, Staff $staff, Route $route, string $direction)
    {
        $trip = Trip::create(['tenant_id' => $this->tenant->id, 'route_id' => $route->id, 'staff_id' => $staff->id, 'direction' => $direction, 'status' => 'active']);

        return $this->actingAs($driver)->getJson("/api/driver/trips/{$trip->id}/roster")->assertOk();
    }

    public function test_drivers_see_where_to_drop_and_pick_up_at_the_center(): void
    {
        $this->roster($this->driverA, $this->staffA, $this->routeA, 'dropoff')
            ->assertJsonPath('0.transit.action', 'drop')
            ->assertJsonPath('0.transit.center_name', 'Bright Kids TC');

        $this->roster($this->driverB, $this->staffB, $this->routeB, 'dropoff')
            ->assertJsonPath('0.transit.action', 'pick')
            ->assertJsonPath('0.transit.leave_center_at', '18:00')
            ->assertJsonPath('0.alight_stop.name', 'Taman Abu')
            // Listed where the driver collects him: at the center.
            ->assertJsonPath('0.pickup_stop.name', 'Bright Kids TC');

        // The morning is unchanged and says nothing about the center.
        $this->roster($this->driverA, $this->staffA, $this->routeA, 'pickup')
            ->assertJsonPath('0.transit', null)
            ->assertJsonPath('0.pickup_stop.name', 'Taman Abu');
    }

    public function test_the_parent_sees_the_plan_and_which_bus_does_each_part(): void
    {
        $this->actingAs($this->parentUser)->getJson('/api/parent/students')
            ->assertOk()
            ->assertJsonPath('0.transit_plans.0.transit_center.name', 'Bright Kids TC')
            ->assertJsonPath('0.transit_plans.0.monthly_amount', '90.00')
            ->assertJsonPath('0.transit_plans.0.rides.0.from', null)
            ->assertJsonPath('0.transit_plans.0.rides.0.to', 'Bright Kids TC')
            ->assertJsonPath('0.transit_plans.0.rides.0.driver.full_name', 'Ali')
            ->assertJsonPath('0.transit_plans.0.rides.1.from', 'Bright Kids TC')
            ->assertJsonPath('0.transit_plans.0.rides.1.to', 'Taman Abu')
            ->assertJsonPath('0.transit_plans.0.rides.1.route', 'Route B')
            ->assertJsonPath('0.transit_plans.0.rides.1.driver.phone', '012-222 2222');
    }

    public function test_the_operator_can_end_a_plan_from_the_student_page(): void
    {
        $this->actingAs($this->admin)->getJson("/api/operator/students/{$this->abu->id}")
            ->assertOk()
            ->assertJsonPath('transit_plans.0.request_id', $this->planId);

        // The center had already asked to stop later; the operator's end answers it.
        $asked = $this->actingAs($this->centerUser)->postJson('/api/transit/requests/stop', [
            'student_id' => $this->abu->id, 'ends_on' => today()->addMonth()->toDateString(),
        ])->assertCreated()->json('id');

        $lastDay = today()->addDays(5)->toDateString();
        $this->actingAs($this->admin)->postJson("/api/operator/students/{$this->abu->id}/transit-plans/{$this->planId}/end", ['ends_on' => $lastDay])
            ->assertOk()
            ->assertJsonPath('transit_plans.0.ends_on', $lastDay);

        $this->assertSame($lastDay, StudentExtra::sole()->ends_on->toDateString());
        $this->assertSame('cancelled', TransitRequest::find($asked)->status);
        Notification::assertSentOnDemandTimes(TransitPlanChanged::class, 2);

        $this->actingAs($this->centerUser)->getJson('/api/transit/requests')
            ->assertOk()
            ->assertJsonPath('0.kind', 'stop')
            ->assertJsonPath('0.status', 'approved');
    }

    public function test_only_admins_end_plans_and_only_the_childs_own(): void
    {
        $staff = $this->createOperatorStaff($this->tenant);
        [, $otherParent] = $this->createParent($this->tenant);
        $other = Student::factory()->create(['tenant_id' => $this->tenant->id, 'parent_id' => $otherParent->id]);

        $this->actingAs($staff)->postJson("/api/operator/students/{$this->abu->id}/transit-plans/{$this->planId}/end", ['ends_on' => today()->toDateString()])
            ->assertForbidden();
        $this->actingAs($this->admin)->postJson("/api/operator/students/{$other->id}/transit-plans/{$this->planId}/end", ['ends_on' => today()->toDateString()])
            ->assertNotFound();
    }
}
