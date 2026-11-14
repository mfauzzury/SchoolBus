<?php

namespace Tests\Feature\Operator;

use App\Models\TransitCenter;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class TransitCenterControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private function details(array $overrides = []): array
    {
        return [
            'name' => 'Bright Kids TC',
            'contact_person' => 'Puan Siti',
            'phone' => '012-345 6789',
            'email' => 'hello@brightkids.my',
            'address' => 'No 1, Jalan Mawar, Shah Alam',
            ...$overrides,
        ];
    }

    public function test_admin_adds_a_transit_center_without_a_login_yet(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        $this->actingAs($admin)->postJson('/api/operator/transit-centers', $this->details())
            ->assertCreated()
            ->assertJsonPath('name', 'Bright Kids TC')
            ->assertJsonPath('status', 'active')
            ->assertJsonPath('has_login', false);

        $this->assertDatabaseHas('transit_centers', ['tenant_id' => $tenant->id, 'email' => 'hello@brightkids.my']);
        $this->assertDatabaseMissing('users', ['email' => 'hello@brightkids.my']);
    }

    public function test_staff_can_see_but_not_add_transit_centers(): void
    {
        $tenant = $this->createTenant();
        $staff = $this->createOperatorStaff($tenant);

        $this->actingAs($staff)->getJson('/api/operator/transit-centers')->assertOk();
        $this->actingAs($staff)->postJson('/api/operator/transit-centers', $this->details())->assertForbidden();
    }

    public function test_an_email_already_used_by_a_login_is_refused(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant, ['email' => 'boss@bas.my']);

        $this->actingAs($admin)->postJson('/api/operator/transit-centers', $this->details(['email' => 'boss@bas.my']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_sending_a_login_creates_it_and_emails_a_set_password_link(): void
    {
        Notification::fake();
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $this->ensureRole('transit_center');
        $center = TransitCenter::create([...$this->details(), 'tenant_id' => $tenant->id]);

        $this->actingAs($admin)->postJson("/api/operator/transit-centers/{$center->id}/login")
            ->assertOk()
            ->assertJsonPath('has_login', true);

        $user = User::where('email', 'hello@brightkids.my')->firstOrFail();
        $this->assertSame($tenant->id, $user->tenant_id);
        $this->assertTrue($user->hasRole('transit_center'));
        $this->assertSame($user->id, $center->fresh()->user_id);
        Notification::assertSentTo($user, ResetPassword::class);

        // Pressing it again sends a fresh link and does not make a second login.
        $this->actingAs($admin)->postJson("/api/operator/transit-centers/{$center->id}/login")->assertOk();
        $this->assertSame(1, User::where('email', 'hello@brightkids.my')->count());
    }

    public function test_switching_a_center_off_stops_its_login(): void
    {
        Notification::fake();
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $this->ensureRole('transit_center');
        $center = TransitCenter::create([...$this->details(), 'tenant_id' => $tenant->id]);
        $this->actingAs($admin)->postJson("/api/operator/transit-centers/{$center->id}/login")->assertOk();
        $user = $center->fresh()->user;
        $user->forceFill(['password' => 'secret-pass'])->save();

        $this->actingAs($admin)->putJson("/api/operator/transit-centers/{$center->id}", [...$this->details(), 'status' => 'inactive'])
            ->assertOk()
            ->assertJsonPath('status', 'inactive');
        $this->assertNotNull($user->fresh()->deactivated_at);

        // The earlier requests switched the app to the API guard; log in as a fresh visitor.
        $this->app['auth']->forgetGuards();
        $this->app['auth']->shouldUse('web');
        $this->fromFrontend()->postJson('/api/login', ['email' => 'hello@brightkids.my', 'password' => 'secret-pass'])
            ->assertUnprocessable();

        $this->actingAs($admin)->putJson("/api/operator/transit-centers/{$center->id}", [...$this->details(), 'status' => 'active'])->assertOk();
        $this->assertNull($user->fresh()->deactivated_at);
    }

    public function test_changing_the_email_moves_the_login_to_it(): void
    {
        Notification::fake();
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $this->ensureRole('transit_center');
        $center = TransitCenter::create([...$this->details(), 'tenant_id' => $tenant->id]);
        $this->actingAs($admin)->postJson("/api/operator/transit-centers/{$center->id}/login")->assertOk();

        $this->actingAs($admin)->putJson("/api/operator/transit-centers/{$center->id}", $this->details(['email' => 'office@brightkids.my']))
            ->assertOk();

        $this->assertSame('office@brightkids.my', $center->fresh()->user->email);
    }

    public function test_an_operator_cannot_see_another_operators_transit_center(): void
    {
        $tenant = $this->createTenant();
        $other = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $theirs = TransitCenter::create([...$this->details(), 'tenant_id' => $other->id]);

        $this->actingAs($admin)->getJson('/api/operator/transit-centers')->assertOk()->assertJsonCount(0);
        $this->actingAs($admin)->getJson("/api/operator/transit-centers/{$theirs->id}")->assertNotFound();
        $this->actingAs($admin)->postJson("/api/operator/transit-centers/{$theirs->id}/login")->assertNotFound();
    }

    public function test_admin_sets_the_monthly_price_for_each_transit_leg(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        $this->actingAs($admin)->getJson('/api/operator/billing-config')
            ->assertOk()
            ->assertJsonPath('transit_prices.school_to_center', null);

        $this->actingAs($admin)->putJson('/api/operator/billing-config', [
            'transit_prices' => ['school_to_center' => 40, 'center_to_home' => 60],
        ])->assertOk()
            ->assertJsonPath('transit_prices.school_to_center', 40)
            ->assertJsonPath('transit_prices.center_to_home', 60)
            ->assertJsonPath('transit_prices.home_to_center', null);

        // Saving one price later keeps the others.
        $this->actingAs($admin)->putJson('/api/operator/billing-config', [
            'transit_prices' => ['home_to_center' => 45],
        ])->assertOk()
            ->assertJsonPath('transit_prices.school_to_center', 40)
            ->assertJsonPath('transit_prices.home_to_center', 45);

        $this->actingAs($admin)->putJson('/api/operator/billing-config', [
            'transit_prices' => ['to_the_moon' => 1],
        ])->assertUnprocessable();
    }
}
