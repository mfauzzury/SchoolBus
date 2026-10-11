<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class TeamControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    public function test_owner_lists_the_platform_team_with_levels(): void
    {
        $owner = $this->createPlatformUser('owner', ['name' => 'Olivia Owner']);
        $this->createPlatformUser('support', ['name' => 'Sam Support']);
        // An operator login must never show up in the platform team.
        $this->createOperatorAdmin($this->createTenant());

        $response = $this->actingAs($owner)->getJson('/api/admin/team');

        $response->assertOk()->assertJsonCount(2);
        $this->assertSame('support', collect($response->json())->firstWhere('name', 'Sam Support')['level']);
        $this->assertSame('owner', collect($response->json())->firstWhere('name', 'Olivia Owner')['level']);
    }

    public function test_owner_adds_a_member_who_gets_a_set_password_email(): void
    {
        Notification::fake();
        $owner = $this->createPlatformUser('owner');

        $this->actingAs($owner)->postJson('/api/admin/team', [
            'name' => 'Fiona Finance',
            'email' => 'fiona@bassekolah.my',
            'level' => 'finance',
        ])->assertCreated()->assertJsonPath('level', 'finance');

        $member = User::where('email', 'fiona@bassekolah.my')->firstOrFail();
        $this->assertNull($member->tenant_id);
        $this->assertTrue($member->hasRole('saas_finance'));
        Notification::assertSentTo($member, ResetPassword::class);
        $this->assertDatabaseHas('activity_logs', ['user_id' => $owner->id, 'action' => 'team_member_created']);
    }

    public function test_adding_a_member_rejects_an_unknown_level_and_a_taken_email(): void
    {
        $owner = $this->createPlatformUser('owner', ['email' => 'owner@bassekolah.my']);

        $this->actingAs($owner)->postJson('/api/admin/team', [
            'name' => 'X', 'email' => 'x@bassekolah.my', 'level' => 'god',
        ])->assertStatus(422)->assertJsonValidationErrors('level');

        $this->actingAs($owner)->postJson('/api/admin/team', [
            'name' => 'X', 'email' => 'owner@bassekolah.my', 'level' => 'support',
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_owner_changes_another_members_level(): void
    {
        $owner = $this->createPlatformUser('owner');
        $member = $this->createPlatformUser('support');

        $this->actingAs($owner)->putJson("/api/admin/team/{$member->id}", ['level' => 'finance'])
            ->assertOk()->assertJsonPath('level', 'finance');

        $member->refresh();
        $this->assertTrue($member->hasRole('saas_finance'));
        $this->assertFalse($member->hasRole('saas_support'));
    }

    public function test_owner_cannot_change_or_remove_themselves(): void
    {
        $owner = $this->createPlatformUser('owner');

        $this->actingAs($owner)->putJson("/api/admin/team/{$owner->id}", ['level' => 'support'])->assertStatus(422);
        $this->actingAs($owner)->postJson("/api/admin/team/{$owner->id}/deactivate")->assertStatus(422);

        $this->assertTrue($owner->fresh()->hasRole('saas_admin'));
        $this->assertNull($owner->fresh()->deactivated_at);
    }

    public function test_deactivating_a_member_ends_their_sessions_and_reactivating_restores_them(): void
    {
        $owner = $this->createPlatformUser('owner');
        $member = $this->createPlatformUser('support');
        DB::table('sessions')->insert([
            'id' => 'abc', 'user_id' => $member->id, 'payload' => '', 'last_activity' => time(),
        ]);

        $this->actingAs($owner)->postJson("/api/admin/team/{$member->id}/deactivate")
            ->assertOk()->assertJsonPath('deactivated_at', fn ($value) => $value !== null);

        $this->assertDatabaseMissing('sessions', ['id' => 'abc']);
        $this->assertDatabaseHas('activity_logs', ['action' => 'team_member_deactivated']);

        $this->actingAs($owner)->postJson("/api/admin/team/{$member->id}/reactivate")->assertOk();
        $this->assertNull($member->fresh()->deactivated_at);
    }

    public function test_a_deactivated_member_cannot_log_in(): void
    {
        $this->createPlatformUser('support', [
            'email' => 'sam@bassekolah.my',
            'password' => 'password',
            'deactivated_at' => now(),
        ]);

        $this->fromFrontend()->postJson('/api/login', ['email' => 'sam@bassekolah.my', 'password' => 'password'])
            ->assertStatus(422);
        $this->assertGuest();
    }

    public function test_operator_logins_are_not_managed_through_the_team_api(): void
    {
        $owner = $this->createPlatformUser('owner');
        $operatorAdmin = $this->createOperatorAdmin($this->createTenant());

        $this->actingAs($owner)->putJson("/api/admin/team/{$operatorAdmin->id}", ['level' => 'owner'])
            ->assertNotFound();
        $this->assertFalse($operatorAdmin->fresh()->hasRole('saas_admin'));
    }

    public function test_finance_and_support_cannot_manage_the_team_or_read_the_log(): void
    {
        foreach (['finance', 'support'] as $level) {
            $user = $this->createPlatformUser($level);

            $this->actingAs($user)->getJson('/api/admin/team')->assertForbidden();
            $this->actingAs($user)->postJson('/api/admin/team', [
                'name' => 'X', 'email' => "{$level}-x@bassekolah.my", 'level' => 'owner',
            ])->assertForbidden();
            $this->actingAs($user)->getJson('/api/admin/activity')->assertForbidden();
        }
    }

    public function test_operators_and_parents_cannot_reach_the_team_api(): void
    {
        $tenant = $this->createTenant();
        $operator = $this->createOperatorAdmin($tenant);
        [$parent] = $this->createParent($tenant);

        $this->actingAs($operator)->getJson('/api/admin/team')->assertForbidden();
        $this->actingAs($parent)->getJson('/api/admin/team')->assertForbidden();
    }
}
