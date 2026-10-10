<?php

namespace Tests\Feature\Driver;

use App\Models\BusOperator;
use App\Models\Route;
use App\Models\RouteStop;
use App\Models\Staff;
use App\Models\Student;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class TripControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    /**
     * @return array{0: User, 1: Staff, 2: Route}
     */
    private function setUpDriverWithRoute(BusOperator $tenant): array
    {
        [$driverUser, $staff] = $this->createDriver($tenant);
        $route = Route::factory()->create(['tenant_id' => $tenant->id, 'driver_id' => $staff->id]);

        return [$driverUser, $staff, $route];
    }

    public function test_today_creates_pickup_and_dropoff_trips_for_the_drivers_routes(): void
    {
        $tenant = $this->createTenant();
        [$driverUser, , $route] = $this->setUpDriverWithRoute($tenant);

        $response = $this->actingAs($driverUser)->getJson('/api/driver/trips/today');

        $response->assertOk();
        $directions = collect($response->json())->pluck('direction')->sort()->values();
        $this->assertEqualsCanonicalizing(['dropoff', 'pickup'], $directions->all());
        $this->assertSame(2, Trip::where('route_id', $route->id)->count());
    }

    public function test_today_is_idempotent_within_the_same_day(): void
    {
        $tenant = $this->createTenant();
        [$driverUser] = $this->setUpDriverWithRoute($tenant);

        $first = $this->actingAs($driverUser)->getJson('/api/driver/trips/today');
        $second = $this->actingAs($driverUser)->getJson('/api/driver/trips/today');

        $firstIds = collect($first->json())->pluck('id')->sort()->values();
        $secondIds = collect($second->json())->pluck('id')->sort()->values();
        $this->assertSame($firstIds->all(), $secondIds->all());
    }

    public function test_driver_can_start_and_end_their_own_trip(): void
    {
        $tenant = $this->createTenant();
        [$driverUser, $staff, $route] = $this->setUpDriverWithRoute($tenant);
        $trip = Trip::create(['tenant_id' => $tenant->id, 'route_id' => $route->id, 'staff_id' => $staff->id, 'direction' => 'pickup', 'status' => 'scheduled']);

        $this->actingAs($driverUser)->postJson("/api/driver/trips/{$trip->id}/start")
            ->assertOk()
            ->assertJsonPath('status', 'active');
        $this->assertNotNull($trip->fresh()->started_at);

        $this->actingAs($driverUser)->postJson("/api/driver/trips/{$trip->id}/end")
            ->assertOk()
            ->assertJsonPath('status', 'completed');
        $this->assertNotNull($trip->fresh()->ended_at);
    }

    public function test_driver_cannot_start_another_drivers_trip(): void
    {
        $tenant = $this->createTenant();
        [, , $route] = $this->setUpDriverWithRoute($tenant);
        [$otherDriverUser] = $this->createDriver($tenant);
        $trip = Trip::create(['tenant_id' => $tenant->id, 'route_id' => $route->id, 'staff_id' => $route->driver_id, 'direction' => 'pickup', 'status' => 'scheduled']);

        $this->actingAs($otherDriverUser)->postJson("/api/driver/trips/{$trip->id}/start")
            ->assertStatus(403);
    }

    public function test_driver_cannot_reach_a_trip_from_another_tenant(): void
    {
        $tenantA = $this->createTenant();
        $tenantB = $this->createTenant();
        [, , $routeA] = $this->setUpDriverWithRoute($tenantA);
        [$driverUserB] = $this->setUpDriverWithRoute($tenantB);
        $tripA = Trip::create(['tenant_id' => $tenantA->id, 'route_id' => $routeA->id, 'staff_id' => $routeA->driver_id, 'direction' => 'pickup', 'status' => 'scheduled']);

        $this->actingAs($driverUserB)->postJson("/api/driver/trips/{$tripA->id}/start")
            ->assertStatus(404);
    }

    public function test_posting_location_upserts_the_latest_position(): void
    {
        $tenant = $this->createTenant();
        [$driverUser, $staff, $route] = $this->setUpDriverWithRoute($tenant);
        $trip = Trip::create(['tenant_id' => $tenant->id, 'route_id' => $route->id, 'staff_id' => $staff->id, 'direction' => 'pickup', 'status' => 'active']);

        // Laravel auto-returns 201 for a freshly-created model, 200 on update
        // (Router::toResponse checks wasRecentlyCreated) — the first ping
        // creates the row, the second is an upsert onto the same row.
        $this->actingAs($driverUser)->postJson("/api/driver/trips/{$trip->id}/location", ['lat' => 3.1390, 'lng' => 101.6869])
            ->assertCreated();
        $this->actingAs($driverUser)->postJson("/api/driver/trips/{$trip->id}/location", ['lat' => 3.1500, 'lng' => 101.7000])
            ->assertOk();

        $this->assertSame(1, \App\Models\TripLocation::where('trip_id', $trip->id)->count());
        $this->assertEquals(3.15, (float) $trip->location()->first()->lat);
    }

    public function test_roster_orders_students_by_stop_sequence_and_reflects_boarding_status(): void
    {
        $tenant = $this->createTenant();
        [$driverUser, $staff, $route] = $this->setUpDriverWithRoute($tenant);
        [, $parent] = $this->createParent($tenant);

        $stopA = RouteStop::create(['tenant_id' => $tenant->id, 'route_id' => $route->id, 'name' => 'Stop A', 'sequence' => 2]);
        $stopB = RouteStop::create(['tenant_id' => $tenant->id, 'route_id' => $route->id, 'name' => 'Stop B', 'sequence' => 1]);

        $studentAtA = Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id, 'route_id' => $route->id, 'pickup_stop_id' => $stopA->id, 'full_name' => 'Student A']);
        $studentAtB = Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id, 'route_id' => $route->id, 'pickup_stop_id' => $stopB->id, 'full_name' => 'Student B']);

        $trip = Trip::create(['tenant_id' => $tenant->id, 'route_id' => $route->id, 'staff_id' => $staff->id, 'direction' => 'pickup', 'status' => 'active']);
        $this->actingAs($driverUser)->postJson("/api/driver/trips/{$trip->id}/students/{$studentAtB->id}/board")->assertCreated();

        $response = $this->actingAs($driverUser)->getJson("/api/driver/trips/{$trip->id}/roster");

        $response->assertOk();
        $names = collect($response->json())->pluck('full_name');
        $this->assertSame(['Student B', 'Student A'], $names->all());
        $this->assertTrue(collect($response->json())->firstWhere('id', $studentAtB->id)['boarded']);
        $this->assertFalse(collect($response->json())->firstWhere('id', $studentAtA->id)['boarded']);
    }

    public function test_roster_carries_the_class_details_parents_filled_in(): void
    {
        $tenant = $this->createTenant();
        [$driverUser, $staff, $route] = $this->setUpDriverWithRoute($tenant);
        [, $parent] = $this->createParent($tenant);
        Student::factory()->create([
            'tenant_id' => $tenant->id,
            'parent_id' => $parent->id,
            'route_id' => $route->id,
            'teacher_name' => 'Cikgu Aminah',
            'class_name' => '3 Bestari',
            'school_phone' => '03-1234 5678',
        ]);
        $trip = Trip::create(['tenant_id' => $tenant->id, 'route_id' => $route->id, 'staff_id' => $staff->id, 'direction' => 'pickup', 'status' => 'active']);

        $this->actingAs($driverUser)->getJson("/api/driver/trips/{$trip->id}/roster")
            ->assertOk()
            ->assertJsonPath('0.teacher_name', 'Cikgu Aminah')
            ->assertJsonPath('0.class_name', '3 Bestari')
            ->assertJsonPath('0.school_phone', '03-1234 5678')
            ->assertJsonPath('0.avatar_url', null);
    }

    public function test_roster_never_exposes_fees_or_billing_to_the_driver(): void
    {
        $tenant = $this->createTenant();
        [$driverUser, $staff, $route] = $this->setUpDriverWithRoute($tenant);
        [, $parent] = $this->createParent($tenant);
        Student::factory()->create([
            'tenant_id' => $tenant->id,
            'parent_id' => $parent->id,
            'route_id' => $route->id,
            'fee_override' => '99.00',
            'billing_starts_on' => '2026-01-01',
        ]);
        $trip = Trip::create(['tenant_id' => $tenant->id, 'route_id' => $route->id, 'staff_id' => $staff->id, 'direction' => 'pickup', 'status' => 'active']);

        $row = $this->actingAs($driverUser)->getJson("/api/driver/trips/{$trip->id}/roster")
            ->assertOk()->json('0');

        foreach (['fee_override', 'billing_starts_on', 'billing_ends_on', 'billing_period', 'package_type', 'enrollment_status', 'date_of_birth', 'avatar_path', 'tenant_id'] as $private) {
            $this->assertArrayNotHasKey($private, $row, "{$private} must not reach the driver");
        }
        $this->assertSame($parent->phone, $row['parent_profile']['phone']);
    }

    public function test_boarding_a_student_twice_does_not_duplicate_the_event(): void
    {
        $tenant = $this->createTenant();
        [$driverUser, $staff, $route] = $this->setUpDriverWithRoute($tenant);
        [, $parent] = $this->createParent($tenant);
        $student = Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id, 'route_id' => $route->id]);
        $trip = Trip::create(['tenant_id' => $tenant->id, 'route_id' => $route->id, 'staff_id' => $staff->id, 'direction' => 'pickup', 'status' => 'active']);

        $this->actingAs($driverUser)->postJson("/api/driver/trips/{$trip->id}/students/{$student->id}/board")->assertCreated();
        $this->actingAs($driverUser)->postJson("/api/driver/trips/{$trip->id}/students/{$student->id}/board")->assertOk();

        $this->assertSame(1, \App\Models\BoardingEvent::where('trip_id', $trip->id)->where('event_type', 'boarded')->count());
    }

    public function test_cannot_board_a_student_who_is_not_on_the_trips_route(): void
    {
        $tenant = $this->createTenant();
        [$driverUser, $staff, $route] = $this->setUpDriverWithRoute($tenant);
        $otherRoute = Route::factory()->create(['tenant_id' => $tenant->id]);
        [, $parent] = $this->createParent($tenant);
        $student = Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $parent->id, 'route_id' => $otherRoute->id]);
        $trip = Trip::create(['tenant_id' => $tenant->id, 'route_id' => $route->id, 'staff_id' => $staff->id, 'direction' => 'pickup', 'status' => 'active']);

        $this->actingAs($driverUser)->postJson("/api/driver/trips/{$trip->id}/students/{$student->id}/board")
            ->assertStatus(422);
    }

    public function test_parent_cannot_access_driver_trip_endpoints(): void
    {
        $tenant = $this->createTenant();
        [, , $route] = $this->setUpDriverWithRoute($tenant);
        [$parentUser] = $this->createParent($tenant);
        $trip = Trip::create(['tenant_id' => $tenant->id, 'route_id' => $route->id, 'staff_id' => $route->driver_id, 'direction' => 'pickup', 'status' => 'scheduled']);

        $this->actingAs($parentUser)->getJson("/api/driver/trips/{$trip->id}/roster")
            ->assertStatus(403);
    }
}
