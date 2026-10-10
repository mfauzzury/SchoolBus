<?php

namespace Tests\Feature\Admin;

use App\Models\ActivityLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class PlatformAccessTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private function billplzPayload(): array
    {
        return [
            'secret_key' => 'secret-123',
            'x_signature_key' => 'xsig-456',
            'collection_id' => 'col_1',
            'sandbox' => true,
        ];
    }

    public function test_every_level_can_look_at_operators_and_transactions(): void
    {
        $tenant = $this->createTenant();

        foreach (['owner', 'finance', 'support'] as $level) {
            $user = $this->createPlatformUser($level);

            $this->actingAs($user)->getJson('/api/admin/operators')->assertOk();
            $this->actingAs($user)->getJson("/api/admin/operators/{$tenant->id}")->assertOk();
            $this->actingAs($user)->getJson('/api/admin/transactions')->assertOk();
            $this->actingAs($user)->getJson('/api/admin/dashboard/summary')->assertOk();
        }
    }

    public function test_finance_and_owner_may_change_billplz_but_support_may_not(): void
    {
        $tenant = $this->createTenant();

        $this->actingAs($this->createPlatformUser('support'))
            ->putJson("/api/admin/operators/{$tenant->id}/billplz", $this->billplzPayload())
            ->assertForbidden();
        $this->assertFalse($tenant->fresh()->hasBillplz());

        $this->actingAs($this->createPlatformUser('finance'))
            ->putJson("/api/admin/operators/{$tenant->id}/billplz", $this->billplzPayload())
            ->assertOk();
        $this->assertTrue($tenant->fresh()->hasBillplz());

        $this->actingAs($this->createPlatformUser('owner'))
            ->deleteJson("/api/admin/operators/{$tenant->id}/billplz")
            ->assertOk();
    }

    public function test_changing_billplz_is_logged_without_the_keys(): void
    {
        $tenant = $this->createTenant();
        $finance = $this->createPlatformUser('finance');

        $this->actingAs($finance)
            ->putJson("/api/admin/operators/{$tenant->id}/billplz", $this->billplzPayload())
            ->assertOk();

        $entry = ActivityLog::firstWhere('action', 'billplz_updated');
        $this->assertSame($finance->id, $entry->user_id);
        $this->assertSame($tenant->id, $entry->tenant_id);
        $this->assertSame('col_1', $entry->properties['collection_id']);
        $this->assertStringNotContainsString('secret-123', json_encode($entry->properties));
        $this->assertStringNotContainsString('xsig-456', json_encode($entry->properties));
    }

    public function test_the_activity_log_can_be_filtered_by_operator(): void
    {
        $owner = $this->createPlatformUser('owner');
        $alpha = $this->createTenant();
        $beta = $this->createTenant();

        foreach ([$alpha, $beta, $alpha] as $tenant) {
            $this->actingAs($owner)
                ->putJson("/api/admin/operators/{$tenant->id}/billplz", $this->billplzPayload())
                ->assertOk();
        }

        $this->actingAs($owner)->getJson('/api/admin/activity')
            ->assertOk()->assertJsonPath('total', 3);
        $this->actingAs($owner)->getJson("/api/admin/activity?tenant_id={$alpha->id}")
            ->assertOk()->assertJsonPath('total', 2)
            ->assertJsonPath('data.0.user.id', $owner->id)
            ->assertJsonPath('data.0.bus_operator.id', $alpha->id);
    }

    public function test_me_lists_what_each_level_may_do(): void
    {
        $owner = $this->actingAs($this->createPlatformUser('owner'))->getJson('/api/me')->json('permissions');
        $finance = $this->actingAs($this->createPlatformUser('finance'))->getJson('/api/me')->json('permissions');
        $support = $this->actingAs($this->createPlatformUser('support'))->getJson('/api/me')->json('permissions');

        $this->assertContains('team.manage', $owner);
        $this->assertContains('operators.suspend', $owner);
        $this->assertEqualsCanonicalizing(['gateway.manage', 'plans.manage', 'transactions.export'], $finance);
        $this->assertEqualsCanonicalizing(['operators.edit', 'operators.impersonate', 'support.manage'], $support);
    }

    public function test_logging_in_records_the_last_login_time(): void
    {
        $user = $this->createPlatformUser('support', ['email' => 'sam@bassekolah.my', 'password' => 'password']);
        $this->assertNull($user->last_login_at);

        $this->fromFrontend()->postJson('/api/login', ['email' => 'sam@bassekolah.my', 'password' => 'password'])
            ->assertOk();

        $this->assertNotNull($user->fresh()->last_login_at);
    }
}
