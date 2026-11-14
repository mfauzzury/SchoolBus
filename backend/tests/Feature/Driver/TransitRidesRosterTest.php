<?php

namespace Tests\Feature\Driver;

use App\Models\BusOperator;
use App\Models\Route;
use App\Models\RouteStop;
use App\Models\Staff;
use App\Models\Student;
use App\Models\StudentRide;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

/**
 * Abu rides route A to school in the morning. After school route A drops him
 * at the transit center instead of home, and route B takes him home from the
 * transit center in the evening.
 */
class TransitRidesRosterTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private BusOperator $tenant;

    private User $driverA;

    private Staff $staffA;

    private Route $routeA;

    private User $driverB;

    private Staff $staffB;

    private Route $routeB;

    private Student $abu;

    private RouteStop $homeOnA;

    private RouteStop $centerOnA;

    private RouteStop $centerOnB;

    private RouteStop $homeOnB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = $this->createTenant();
        [$this->driverA, $this->staffA] = $this->createDriver($this->tenant);
        [$this->driverB, $this->staffB] = $this->createDriver($this->tenant);
        $this->routeA = Route::factory()->create(['tenant_id' => $this->tenant->id, 'driver_id' => $this->staffA->id]);
        $this->routeB = Route::factory()->create(['tenant_id' => $this->tenant->id, 'driver_id' => $this->staffB->id]);

        $this->homeOnA = $this->stop($this->routeA, 'Taman Abu', 1);
        $this->centerOnA = $this->stop($this->routeA, 'Bright Kids TC', 2);
        $this->centerOnB = $this->stop($this->routeB, 'Bright Kids TC', 1);
        $this->homeOnB = $this->stop($this->routeB, 'Taman Abu', 2);

        [, $parent] = $this->createParent($this->tenant);
        $this->abu = Student::factory()->create([
            'tenant_id' => $this->tenant->id,
            'parent_id' => $parent->id,
            'route_id' => $this->routeA->id,
            'pickup_stop_id' => $this->homeOnA->id,
            'full_name' => 'Abu',
        ]);
    }

    private function stop(Route $route, string $name, int $sequence): RouteStop
    {
        return RouteStop::create(['tenant_id' => $this->tenant->id, 'route_id' => $route->id, 'name' => $name, 'sequence' => $sequence]);
    }

    private function trip(Route $route, Staff $staff, string $direction): Trip
    {
        return Trip::create(['tenant_id' => $this->tenant->id, 'route_id' => $route->id, 'staff_id' => $staff->id, 'direction' => $direction, 'status' => 'active']);
    }

    private function goViaTransitCenter(string $startsOn, ?string $endsOn = null): void
    {
        $common = ['tenant_id' => $this->tenant->id, 'student_id' => $this->abu->id, 'direction' => 'dropoff', 'starts_on' => $startsOn, 'ends_on' => $endsOn];

        StudentRide::create([...$common, 'route_id' => $this->routeA->id, 'board_stop_id' => null, 'alight_stop_id' => $this->centerOnA->id]);
        StudentRide::create([...$common, 'route_id' => $this->routeB->id, 'board_stop_id' => $this->centerOnB->id, 'alight_stop_id' => $this->homeOnB->id]);
    }

    private function rosterNames(User $driver, Trip $trip): array
    {
        return collect($this->actingAs($driver)->getJson("/api/driver/trips/{$trip->id}/roster")->assertOk()->json())
            ->pluck('full_name')->all();
    }

    public function test_the_morning_trip_is_unchanged(): void
    {
        $this->goViaTransitCenter(today()->toDateString());
        $trip = $this->trip($this->routeA, $this->staffA, 'pickup');

        $this->actingAs($this->driverA)->getJson("/api/driver/trips/{$trip->id}/roster")
            ->assertOk()
            ->assertJsonPath('0.full_name', 'Abu')
            ->assertJsonPath('0.pickup_stop.id', $this->homeOnA->id);
    }

    public function test_after_school_the_first_bus_drops_him_at_the_transit_center(): void
    {
        $this->goViaTransitCenter(today()->toDateString());
        $trip = $this->trip($this->routeA, $this->staffA, 'dropoff');

        $this->actingAs($this->driverA)->getJson("/api/driver/trips/{$trip->id}/roster")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.pickup_stop.name', 'Bright Kids TC')
            ->assertJsonPath('0.alight_stop.id', $this->centerOnA->id)
            ->assertJsonPath('0.board_stop', null);
    }

    public function test_the_second_bus_takes_him_home_from_the_transit_center(): void
    {
        $this->goViaTransitCenter(today()->toDateString());
        $evening = $this->trip($this->routeB, $this->staffB, 'dropoff');
        $morningB = $this->trip($this->routeB, $this->staffB, 'pickup');

        $this->actingAs($this->driverB)->getJson("/api/driver/trips/{$evening->id}/roster")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.board_stop.id', $this->centerOnB->id)
            ->assertJsonPath('0.alight_stop.id', $this->homeOnB->id);

        $this->assertSame([], $this->rosterNames($this->driverB, $morningB));
    }

    public function test_the_second_driver_can_check_him_on_and_off(): void
    {
        $this->goViaTransitCenter(today()->toDateString());
        $evening = $this->trip($this->routeB, $this->staffB, 'dropoff');

        $this->actingAs($this->driverB)
            ->putJson("/api/driver/trips/{$evening->id}/students/{$this->abu->id}/status", ['status' => 'boarded'])
            ->assertOk();

        $this->assertDatabaseHas('boarding_events', ['trip_id' => $evening->id, 'student_id' => $this->abu->id, 'event_type' => 'boarded']);
    }

    public function test_before_the_start_date_he_goes_home_as_usual(): void
    {
        $this->goViaTransitCenter(today()->addDay()->toDateString());

        $dropoffA = $this->trip($this->routeA, $this->staffA, 'dropoff');
        $dropoffB = $this->trip($this->routeB, $this->staffB, 'dropoff');

        $this->actingAs($this->driverA)->getJson("/api/driver/trips/{$dropoffA->id}/roster")
            ->assertOk()
            ->assertJsonPath('0.pickup_stop.id', $this->homeOnA->id);
        $this->assertSame([], $this->rosterNames($this->driverB, $dropoffB));
    }

    public function test_after_the_end_date_he_goes_home_as_usual(): void
    {
        $this->goViaTransitCenter(today()->subMonth()->toDateString(), today()->subDay()->toDateString());

        $dropoffA = $this->trip($this->routeA, $this->staffA, 'dropoff');
        $dropoffB = $this->trip($this->routeB, $this->staffB, 'dropoff');

        $this->actingAs($this->driverA)->getJson("/api/driver/trips/{$dropoffA->id}/roster")
            ->assertOk()
            ->assertJsonPath('0.pickup_stop.id', $this->homeOnA->id);
        $this->assertSame([], $this->rosterNames($this->driverB, $dropoffB));
    }

    public function test_a_child_whose_afternoon_is_only_on_another_route_is_not_on_his_own_routes_afternoon_trip(): void
    {
        StudentRide::create([
            'tenant_id' => $this->tenant->id, 'student_id' => $this->abu->id, 'direction' => 'dropoff',
            'route_id' => $this->routeB->id, 'board_stop_id' => null, 'alight_stop_id' => $this->centerOnB->id,
            'starts_on' => today()->toDateString(),
        ]);
        $dropoffA = $this->trip($this->routeA, $this->staffA, 'dropoff');

        $this->assertSame([], $this->rosterNames($this->driverA, $dropoffA));
        $this->actingAs($this->driverA)
            ->putJson("/api/driver/trips/{$dropoffA->id}/students/{$this->abu->id}/status", ['status' => 'boarded'])
            ->assertStatus(422);
    }
}
