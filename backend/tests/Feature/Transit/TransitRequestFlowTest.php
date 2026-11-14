<?php

namespace Tests\Feature\Transit;

use App\Models\BusOperator;
use App\Models\Route;
use App\Models\RouteStop;
use App\Models\Student;
use App\Models\StudentExtra;
use App\Models\StudentRide;
use App\Models\TransitCenter;
use App\Models\TransitRequest;
use App\Models\Trip;
use App\Models\User;
use App\Notifications\TransitPlanChanged;
use App\Notifications\TransitRequestReceived;
use App\Services\TripRoster;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

/**
 * Abu rides route A. Bright Kids TC asks for "after school to the center" on
 * route A and "center to home" on the evening route B; the operator approves.
 */
class TransitRequestFlowTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private BusOperator $tenant;

    private User $admin;

    private User $centerUser;

    private TransitCenter $center;

    private Route $routeA;

    private Route $routeB;

    private RouteStop $homeOnA;

    private RouteStop $schoolGateOnA;

    private RouteStop $homeOnB;

    private Student $abu;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();

        $this->tenant = $this->createTenant([
            'billing_config' => ['transit_prices' => ['school_to_center' => 40, 'center_to_home' => 60]],
        ]);
        $this->admin = $this->createOperatorAdmin($this->tenant, ['email' => 'boss@bas.my']);
        [$this->centerUser, $this->center] = $this->centerFor($this->tenant, 'Bright Kids TC');

        $this->routeA = Route::factory()->create(['tenant_id' => $this->tenant->id, 'name' => 'Route A']);
        $this->routeB = Route::factory()->create(['tenant_id' => $this->tenant->id, 'name' => 'Route B (evening)']);
        $this->homeOnA = $this->stop($this->routeA, 'Taman Abu', 1);
        $this->schoolGateOnA = $this->stop($this->routeA, 'Pasar', 2);
        $this->stop($this->routeB, 'Seksyen 7', 1);
        $this->homeOnB = $this->stop($this->routeB, 'Taman Abu', 2);

        [, $parent] = $this->createParent($this->tenant, ['email' => 'mak.abu@mail.my'], ['full_name' => 'Mak Abu', 'phone' => '012-345 6789', 'email' => 'mak.abu@mail.my']);
        $this->abu = Student::factory()->create([
            'tenant_id' => $this->tenant->id,
            'parent_id' => $parent->id,
            'route_id' => $this->routeA->id,
            'pickup_stop_id' => $this->homeOnA->id,
            'full_name' => 'Abu Bakar',
        ]);
    }

    private function centerFor(BusOperator $tenant, string $name): array
    {
        $this->ensureRole('transit_center');
        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $user->assignRole('transit_center');
        $center = TransitCenter::create([
            'tenant_id' => $tenant->id, 'user_id' => $user->id, 'name' => $name,
            'phone' => '03-555 0000', 'email' => $user->email, 'status' => 'active',
        ]);

        return [$user, $center];
    }

    private function stop(Route $route, string $name, int $sequence): RouteStop
    {
        return RouteStop::create(['tenant_id' => $this->tenant->id, 'route_id' => $route->id, 'name' => $name, 'sequence' => $sequence]);
    }

    private function ask(array $overrides = [], ?User $as = null)
    {
        return $this->actingAs($as ?? $this->centerUser)->postJson('/api/transit/requests', [
            'student_id' => $this->abu->id,
            'legs' => ['school_to_center', 'center_to_home'],
            'center_after_stop_id' => $this->schoolGateOnA->id,
            'starts_on' => today()->addDays(3)->toDateString(),
            'leave_center_at' => '18:00',
            ...$overrides,
        ]);
    }

    private function approvePayload(array $overrides = []): array
    {
        return [
            'monthly_amount' => 90,
            'starts_on' => today()->addDays(3)->toDateString(),
            'legs' => [
                ['leg' => 'school_to_center', 'route_id' => $this->routeA->id, 'center_after_stop_id' => $this->schoolGateOnA->id],
                ['leg' => 'center_to_home', 'route_id' => $this->routeB->id, 'center_after_stop_id' => null, 'home_stop_id' => $this->homeOnB->id],
            ],
            ...$overrides,
        ];
    }

    // ---- finding the child ----

    public function test_a_center_finds_a_child_by_name_or_parent_phone_without_seeing_the_full_number(): void
    {
        $this->actingAs($this->centerUser)->getJson('/api/transit/students?q=abu')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.full_name', 'Abu Bakar')
            ->assertJsonPath('0.parent_phone_end', '6789')
            ->assertJsonMissingPath('0.parent_phone')
            ->assertJsonMissingPath('0.fee_override');

        $this->actingAs($this->centerUser)->getJson('/api/transit/students?q=0123456789')
            ->assertOk()
            ->assertJsonPath('0.id', $this->abu->id);

        $this->actingAs($this->centerUser)->getJson('/api/transit/students?q=ab')->assertOk()->assertJsonCount(0);
    }

    public function test_a_center_never_finds_another_operators_children_or_withdrawn_children(): void
    {
        $other = $this->createTenant();
        [, $otherParent] = $this->createParent($other);
        $stranger = Student::factory()->create(['tenant_id' => $other->id, 'parent_id' => $otherParent->id, 'full_name' => 'Abu Lain']);
        $this->abu->update(['enrollment_status' => 'withdrawn']);

        $this->actingAs($this->centerUser)->getJson('/api/transit/students?q=abu')->assertOk()->assertJsonCount(0);
        $this->actingAs($this->centerUser)->getJson("/api/transit/students/{$stranger->id}")->assertNotFound();
    }

    public function test_a_center_sees_the_childs_route_to_place_itself_on(): void
    {
        $this->actingAs($this->centerUser)->getJson("/api/transit/students/{$this->abu->id}")
            ->assertOk()
            ->assertJsonPath('route.name', 'Route A')
            ->assertJsonPath('route.stops.0.name', 'Taman Abu')
            ->assertJsonPath('route.stops.1.name', 'Pasar')
            ->assertJsonPath('status_here', null)
            ->assertJsonPath('plan', null);
    }

    // ---- asking ----

    public function test_asking_adds_up_the_leg_prices_and_emails_the_operator(): void
    {
        $this->ask()
            ->assertCreated()
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('indicative_amount', '100.00');

        Notification::assertSentOnDemand(TransitRequestReceived::class, fn ($n, $channels, $notifiable) => array_key_exists('boss@bas.my', $notifiable->routes['mail']));

        // Nothing changes for the child until the operator approves.
        $this->assertSame(0, StudentRide::count());
    }

    public function test_the_price_is_left_to_the_operator_when_a_leg_has_no_price(): void
    {
        $this->ask(['legs' => ['home_to_center']])->assertCreated()->assertJsonPath('indicative_amount', null);
    }

    public function test_one_waiting_request_per_child_and_it_can_be_cancelled(): void
    {
        $id = $this->ask()->assertCreated()->json('id');
        $this->ask()->assertUnprocessable();

        $this->actingAs($this->centerUser)->postJson("/api/transit/requests/{$id}/cancel")
            ->assertOk()->assertJsonPath('status', 'cancelled');
        $this->ask()->assertCreated();
    }

    public function test_the_center_can_only_be_placed_on_the_childs_own_route(): void
    {
        $this->ask(['center_after_stop_id' => $this->homeOnB->id])->assertUnprocessable()->assertJsonValidationErrors('center_after_stop_id');
    }

    // ---- approving ----

    public function test_approving_puts_the_center_on_both_routes_and_changes_the_childs_afternoon(): void
    {
        $id = $this->ask()->json('id');

        $this->actingAs($this->admin)->postJson("/api/operator/transit-requests/{$id}/approve", $this->approvePayload())
            ->assertOk()
            ->assertJsonPath('status', 'approved')
            ->assertJsonPath('approved_amount', '90.00');

        // Route A: Taman Abu, Pasar, Bright Kids TC. Route B: Bright Kids TC first, then the rest moved down.
        $this->assertSame(['Taman Abu', 'Pasar', 'Bright Kids TC'], $this->routeA->stops()->pluck('name')->all());
        $this->assertSame(['Bright Kids TC', 'Seksyen 7', 'Taman Abu'], $this->routeB->stops()->pluck('name')->all());

        $this->assertSame(2, StudentRide::where('student_id', $this->abu->id)->count());
        $extra = StudentExtra::where('student_id', $this->abu->id)->sole();
        $this->assertSame('90.00', $extra->monthly_amount);
        $this->assertSame('Transit center: Bright Kids TC', $extra->label);

        Notification::assertSentOnDemand(TransitPlanChanged::class, fn ($n, $channels, $notifiable) => array_key_exists('mak.abu@mail.my', $notifiable->routes['mail']));

        // On the start day, route B's afternoon trip takes Abu from the center to his stop.
        $this->travelTo(today()->addDays(3)->setTime(15, 0));
        $trip = Trip::create(['tenant_id' => $this->tenant->id, 'route_id' => $this->routeB->id, 'direction' => 'dropoff', 'status' => 'scheduled']);
        $row = app(TripRoster::class)->for($trip)->sole();
        $this->assertSame('Bright Kids TC', $row['board_stop']->name);
        $this->assertSame($this->homeOnB->id, $row['alight_stop']->id);

        $this->actingAs($this->centerUser)->getJson('/api/transit/children')
            ->assertOk()->assertJsonCount(1)->assertJsonPath('0.student.full_name', 'Abu Bakar');
    }

    public function test_a_second_child_reuses_the_centers_stop(): void
    {
        $first = $this->ask()->json('id');
        $this->actingAs($this->admin)->postJson("/api/operator/transit-requests/{$first}/approve", $this->approvePayload())->assertOk();

        $sibling = Student::factory()->create(['tenant_id' => $this->tenant->id, 'parent_id' => $this->abu->parent_id, 'route_id' => $this->routeA->id, 'full_name' => 'Aminah']);
        $second = $this->ask(['student_id' => $sibling->id])->json('id');
        $this->actingAs($this->admin)->postJson("/api/operator/transit-requests/{$second}/approve", $this->approvePayload())->assertOk();

        $this->assertSame(1, RouteStop::where('route_id', $this->routeA->id)->where('transit_center_id', $this->center->id)->count());
        $this->assertSame(1, RouteStop::where('route_id', $this->routeB->id)->where('transit_center_id', $this->center->id)->count());
    }

    public function test_approving_needs_a_bus_for_every_leg_and_stops_on_that_bus(): void
    {
        $id = $this->ask()->json('id');
        $url = "/api/operator/transit-requests/{$id}/approve";

        $onlyOne = $this->approvePayload();
        array_pop($onlyOne['legs']);
        $this->actingAs($this->admin)->postJson($url, $onlyOne)->assertUnprocessable()->assertJsonValidationErrors('legs');

        $noHome = $this->approvePayload();
        unset($noHome['legs'][1]['home_stop_id']);
        $this->actingAs($this->admin)->postJson($url, $noHome)->assertUnprocessable()->assertJsonValidationErrors('legs.1.home_stop_id');

        $wrongRoute = $this->approvePayload();
        $wrongRoute['legs'][1]['home_stop_id'] = $this->homeOnA->id;
        $this->actingAs($this->admin)->postJson($url, $wrongRoute)->assertUnprocessable()->assertJsonValidationErrors('legs.1.home_stop_id');

        $this->assertSame('pending', TransitRequest::find($id)->status);
    }

    public function test_rejecting_needs_a_reason_and_changes_nothing(): void
    {
        $id = $this->ask()->json('id');

        $this->actingAs($this->admin)->postJson("/api/operator/transit-requests/{$id}/reject", [])->assertUnprocessable();
        $this->actingAs($this->admin)->postJson("/api/operator/transit-requests/{$id}/reject", ['rejection_reason' => 'Parent said no'])
            ->assertOk()->assertJsonPath('status', 'rejected');

        $this->assertSame(0, StudentRide::count());
        $this->actingAs($this->admin)->postJson("/api/operator/transit-requests/{$id}/approve", $this->approvePayload())->assertUnprocessable();
    }

    public function test_staff_can_look_but_only_admins_decide_and_other_operators_see_nothing(): void
    {
        $id = $this->ask()->json('id');
        $staff = $this->createOperatorStaff($this->tenant);
        $otherAdmin = $this->createOperatorAdmin($this->createTenant());

        $this->actingAs($staff)->getJson("/api/operator/transit-requests/{$id}")->assertOk();
        $this->actingAs($staff)->postJson("/api/operator/transit-requests/{$id}/approve", $this->approvePayload())->assertForbidden();
        $this->actingAs($otherAdmin)->getJson("/api/operator/transit-requests/{$id}")->assertNotFound();
    }

    // ---- stopping and replacing ----

    public function test_stopping_ends_the_rides_and_the_charge_after_the_last_day(): void
    {
        $this->travelTo(today()->setTime(9, 0));
        $start = $this->ask(['starts_on' => today()->toDateString()])->json('id');
        $this->actingAs($this->admin)->postJson("/api/operator/transit-requests/{$start}/approve", $this->approvePayload(['starts_on' => today()->toDateString()]))->assertOk();

        $lastDay = today()->addDays(10)->toDateString();
        $stop = $this->actingAs($this->centerUser)->postJson('/api/transit/requests/stop', ['student_id' => $this->abu->id, 'ends_on' => $lastDay])
            ->assertCreated()->json('id');
        $this->actingAs($this->centerUser)->getJson('/api/transit/children')->assertJsonPath('0.stop_pending', true);

        $this->actingAs($this->admin)->postJson("/api/operator/transit-requests/{$stop}/approve", ['ends_on' => $lastDay])->assertOk();

        $this->assertSame([$lastDay, $lastDay], StudentRide::pluck('ends_on')->map->toDateString()->all());
        $this->assertSame($lastDay, StudentExtra::sole()->ends_on->toDateString());
    }

    public function test_a_plan_from_a_new_center_for_the_afternoon_replaces_the_old_one(): void
    {
        $this->travelTo(today()->setTime(9, 0));
        $first = $this->ask(['starts_on' => today()->toDateString()])->json('id');
        $this->actingAs($this->admin)->postJson("/api/operator/transit-requests/{$first}/approve", $this->approvePayload(['starts_on' => today()->toDateString()]))->assertOk();

        [$otherUser] = $this->centerFor($this->tenant, 'Smart Tuition');
        $startsOn = today()->addDays(5)->toDateString();
        $second = $this->ask(['legs' => ['school_to_center'], 'starts_on' => $startsOn], $otherUser)->assertCreated()->json('id');
        $this->actingAs($this->admin)->postJson("/api/operator/transit-requests/{$second}/approve", [
            'monthly_amount' => 40,
            'starts_on' => $startsOn,
            'legs' => [['leg' => 'school_to_center', 'route_id' => $this->routeA->id, 'center_after_stop_id' => null]],
        ])->assertOk();

        $dayBefore = today()->addDays(4)->toDateString();
        $this->assertSame($dayBefore, StudentExtra::where('transit_request_id', $first)->sole()->ends_on->toDateString());
        $this->assertNull(StudentExtra::where('transit_request_id', $second)->sole()->ends_on);
        $this->assertSame(0, StudentRide::where('transit_request_id', $first)->whereNull('ends_on')->count());
    }

    public function test_a_stop_in_use_by_a_plan_cannot_be_removed_from_the_route(): void
    {
        $this->travelTo(today()->setTime(9, 0));
        $id = $this->ask(['starts_on' => today()->toDateString()])->json('id');
        $this->actingAs($this->admin)->postJson("/api/operator/transit-requests/{$id}/approve", $this->approvePayload(['starts_on' => today()->toDateString()]))->assertOk();

        $this->actingAs($this->admin)->putJson("/api/operator/routes/{$this->routeA->id}", [
            'name' => 'Route A',
            'stops' => [['name' => 'Taman Abu', 'sequence' => 1], ['name' => 'Pasar', 'sequence' => 2]],
        ])->assertUnprocessable()->assertJsonValidationErrors('stops');
    }
}
