<?php

namespace Tests\Feature\Admin;

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

    public function test_the_platform_adds_a_center_for_an_operator_without_a_login_yet(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createPlatformUser('owner');

        $this->actingAs($admin)->postJson('/api/admin/transit-centers', $this->details(['operator_id' => $tenant->id]))
            ->assertCreated()
            ->assertJsonPath('operator.id', $tenant->id)
            ->assertJsonPath('name', 'Bright Kids TC')
            ->assertJsonPath('status', 'active')
            ->assertJsonPath('has_login', false);

        $this->assertDatabaseHas('transit_centers', ['tenant_id' => $tenant->id, 'email' => 'hello@brightkids.my']);
        $this->assertDatabaseMissing('users', ['email' => 'hello@brightkids.my']);
    }

    public function test_only_platform_levels_that_edit_operators_can_add_centers(): void
    {
        $tenant = $this->createTenant();
        $finance = $this->createPlatformUser('finance');
        $support = $this->createPlatformUser('support');
        $operatorAdmin = $this->createOperatorAdmin($tenant);

        $this->actingAs($finance)->getJson('/api/admin/transit-centers')->assertOk();
        $this->actingAs($finance)->postJson('/api/admin/transit-centers', $this->details(['operator_id' => $tenant->id]))->assertForbidden();
        $this->actingAs($operatorAdmin)->postJson('/api/admin/transit-centers', $this->details(['operator_id' => $tenant->id]))->assertForbidden();
        $this->actingAs($support)->postJson('/api/admin/transit-centers', $this->details(['operator_id' => $tenant->id]))->assertCreated();
    }

    public function test_the_list_shows_each_centers_operator_and_can_be_filtered(): void
    {
        $owner = $this->createPlatformUser('owner');
        $a = $this->createTenant(['company_name' => 'Bas A']);
        $b = $this->createTenant(['company_name' => 'Bas B']);
        TransitCenter::create([...$this->details(['email' => 'a@tc.my']), 'tenant_id' => $a->id]);
        TransitCenter::create([...$this->details(['name' => 'Smart Tuition', 'email' => 'b@tc.my']), 'tenant_id' => $b->id]);

        $this->actingAs($owner)->getJson('/api/admin/transit-centers')->assertOk()->assertJsonCount(2);
        $this->actingAs($owner)->getJson("/api/admin/transit-centers?operator_id={$b->id}")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Smart Tuition')
            ->assertJsonPath('0.operator.company_name', 'Bas B');
    }

    public function test_an_email_already_used_by_a_login_is_refused(): void
    {
        $tenant = $this->createTenant();
        $this->createOperatorAdmin($tenant, ['email' => 'boss@bas.my']);
        $admin = $this->createPlatformUser('owner');

        $this->actingAs($admin)->postJson('/api/admin/transit-centers', $this->details(['operator_id' => $tenant->id, 'email' => 'boss@bas.my']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_sending_a_login_creates_it_and_emails_a_set_password_link(): void
    {
        Notification::fake();
        $tenant = $this->createTenant();
        $admin = $this->createPlatformUser('owner');
        $this->ensureRole('transit_center');
        $center = TransitCenter::create([...$this->details(), 'tenant_id' => $tenant->id]);

        $this->actingAs($admin)->postJson("/api/admin/transit-centers/{$center->id}/login")
            ->assertOk()
            ->assertJsonPath('has_login', true);

        $user = User::where('email', 'hello@brightkids.my')->firstOrFail();
        $this->assertSame($tenant->id, $user->tenant_id);
        $this->assertTrue($user->hasRole('transit_center'));
        $this->assertSame($user->id, $center->fresh()->user_id);
        Notification::assertSentTo($user, ResetPassword::class);

        // Pressing it again sends a fresh link and does not make a second login.
        $this->actingAs($admin)->postJson("/api/admin/transit-centers/{$center->id}/login")->assertOk();
        $this->assertSame(1, User::where('email', 'hello@brightkids.my')->count());
    }

    public function test_switching_a_center_off_stops_its_login(): void
    {
        Notification::fake();
        $tenant = $this->createTenant();
        $admin = $this->createPlatformUser('owner');
        $this->ensureRole('transit_center');
        $center = TransitCenter::create([...$this->details(), 'tenant_id' => $tenant->id]);
        $this->actingAs($admin)->postJson("/api/admin/transit-centers/{$center->id}/login")->assertOk();
        $user = $center->fresh()->user;
        $user->forceFill(['password' => 'secret-pass'])->save();

        $this->actingAs($admin)->putJson("/api/admin/transit-centers/{$center->id}", [...$this->details(), 'status' => 'inactive'])
            ->assertOk()
            ->assertJsonPath('status', 'inactive');
        $this->assertNotNull($user->fresh()->deactivated_at);

        // The earlier requests switched the app to the API guard; log in as a fresh visitor.
        $this->app['auth']->forgetGuards();
        $this->app['auth']->shouldUse('web');
        $this->fromFrontend()->postJson('/api/login', ['email' => 'hello@brightkids.my', 'password' => 'secret-pass'])
            ->assertUnprocessable();

        $this->actingAs($admin)->putJson("/api/admin/transit-centers/{$center->id}", [...$this->details(), 'status' => 'active'])->assertOk();
        $this->assertNull($user->fresh()->deactivated_at);
    }

    public function test_changing_the_email_moves_the_login_to_it(): void
    {
        Notification::fake();
        $tenant = $this->createTenant();
        $admin = $this->createPlatformUser('owner');
        $this->ensureRole('transit_center');
        $center = TransitCenter::create([...$this->details(), 'tenant_id' => $tenant->id]);
        $this->actingAs($admin)->postJson("/api/admin/transit-centers/{$center->id}/login")->assertOk();

        $this->actingAs($admin)->putJson("/api/admin/transit-centers/{$center->id}", $this->details(['email' => 'office@brightkids.my']))
            ->assertOk();

        $this->assertSame('office@brightkids.my', $center->fresh()->user->email);
    }


}
