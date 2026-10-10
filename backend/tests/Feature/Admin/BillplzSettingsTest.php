<?php

namespace Tests\Feature\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class BillplzSettingsTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return [
            'secret_key' => 'plain-secret-key',
            'x_signature_key' => 'plain-xsig-key',
            'collection_id' => 'col123',
            'sandbox' => true,
            ...$overrides,
        ];
    }

    public function test_platform_admin_configures_an_operator_and_keys_are_stored_encrypted(): void
    {
        $admin = $this->createSaasAdmin();
        $tenant = $this->createTenant();

        $this->actingAs($admin)
            ->putJson("/api/admin/operators/{$tenant->id}/billplz", $this->payload())
            ->assertOk()
            ->assertJson([
                'enabled' => true,
                'sandbox' => true,
                'collection_id' => 'col123',
                'has_secret_key' => true,
                'has_x_signature_key' => true,
            ])
            ->assertJsonMissingPath('secret_key');

        $raw = DB::table('bus_operators')->where('id', $tenant->id)->first();
        $this->assertNotSame('plain-secret-key', $raw->billplz_secret_key);
        $this->assertNotSame('plain-xsig-key', $raw->billplz_x_signature_key);
        $this->assertSame('plain-secret-key', $tenant->fresh()->billplz_secret_key);
    }

    public function test_keys_are_never_returned_by_the_admin_detail_or_by_me(): void
    {
        $admin = $this->createSaasAdmin();
        $tenant = $this->createTenant();
        $this->actingAs($admin)->putJson("/api/admin/operators/{$tenant->id}/billplz", $this->payload())->assertOk();

        $detail = $this->actingAs($admin)->getJson("/api/admin/operators/{$tenant->id}")->assertOk();
        $detail->assertJsonPath('billplz.enabled', true);
        $this->assertStringNotContainsString('plain-secret-key', $detail->getContent());
        $this->assertStringNotContainsString('plain-xsig-key', $detail->getContent());

        [$parent] = $this->createParent($tenant);
        $me = $this->actingAs($parent)->getJson('/api/me')->assertOk();
        $this->assertStringNotContainsString('plain-secret-key', $me->getContent());
        $this->assertStringNotContainsString('plain-xsig-key', $me->getContent());
        $me->assertJsonPath('tenant.billplz_enabled', true);
    }

    public function test_updating_without_keys_keeps_the_stored_ones(): void
    {
        $admin = $this->createSaasAdmin();
        $tenant = $this->createTenant();
        $this->actingAs($admin)->putJson("/api/admin/operators/{$tenant->id}/billplz", $this->payload())->assertOk();

        $this->actingAs($admin)
            ->putJson("/api/admin/operators/{$tenant->id}/billplz", [
                'collection_id' => 'col999', 'sandbox' => false,
            ])
            ->assertOk()
            ->assertJson(['collection_id' => 'col999', 'sandbox' => false, 'enabled' => true]);

        $this->assertSame('plain-secret-key', $tenant->fresh()->billplz_secret_key);
        $this->assertSame('plain-xsig-key', $tenant->fresh()->billplz_x_signature_key);
    }

    public function test_first_time_setup_requires_both_keys(): void
    {
        $admin = $this->createSaasAdmin();
        $tenant = $this->createTenant();

        $this->actingAs($admin)
            ->putJson("/api/admin/operators/{$tenant->id}/billplz", ['collection_id' => 'c', 'sandbox' => false])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['secret_key', 'x_signature_key']);
    }

    public function test_operators_cannot_configure_their_own_gateway(): void
    {
        $tenant = $this->createTenant();
        $operatorAdmin = $this->createOperatorAdmin($tenant);

        $this->actingAs($operatorAdmin)
            ->putJson("/api/admin/operators/{$tenant->id}/billplz", $this->payload())
            ->assertForbidden();

        $this->assertFalse($tenant->fresh()->hasBillplz());
    }

    public function test_the_platform_admin_can_disable_online_payments(): void
    {
        $admin = $this->createSaasAdmin();
        $tenant = $this->createTenant();
        $this->actingAs($admin)->putJson("/api/admin/operators/{$tenant->id}/billplz", $this->payload())->assertOk();

        $this->actingAs($admin)
            ->deleteJson("/api/admin/operators/{$tenant->id}/billplz")
            ->assertOk()
            ->assertJson(['enabled' => false, 'has_secret_key' => false]);

        $this->assertFalse($tenant->fresh()->hasBillplz());
    }

    private function configuredTenant(array $payload = []): array
    {
        $admin = $this->createSaasAdmin();
        $tenant = $this->createTenant();
        $this->actingAs($admin)
            ->putJson("/api/admin/operators/{$tenant->id}/billplz", $this->payload($payload))
            ->assertOk();

        return [$admin, $tenant];
    }

    public function test_connection_test_reports_success_with_the_collection_title(): void
    {
        Http::fake(['www.billplz-sandbox.com/api/v3/collections/col123' => Http::response(['id' => 'col123', 'title' => 'School Fees'])]);
        [$admin, $tenant] = $this->configuredTenant();

        $this->actingAs($admin)
            ->postJson("/api/admin/operators/{$tenant->id}/billplz/test")
            ->assertOk()
            ->assertJson(['ok' => true, 'reason' => 'ok', 'collection_title' => 'School Fees', 'warnings' => []]);

        Http::assertSent(fn ($request) => $request->hasHeader('Authorization', 'Basic '.base64_encode('plain-secret-key:')));
    }

    public function test_connection_test_uses_the_live_endpoint_when_not_in_sandbox(): void
    {
        Http::fake(['www.billplz.com/api/v3/collections/col123' => Http::response(['title' => 'Live'])]);
        [$admin, $tenant] = $this->configuredTenant(['sandbox' => false]);

        $this->actingAs($admin)
            ->postJson("/api/admin/operators/{$tenant->id}/billplz/test")
            ->assertJson(['ok' => true]);
    }

    public function test_connection_test_flags_a_rejected_secret_key(): void
    {
        Http::fake(['*' => Http::response(['error' => ['type' => 'Unauthorized']], 401)]);
        [$admin, $tenant] = $this->configuredTenant();

        $this->actingAs($admin)
            ->postJson("/api/admin/operators/{$tenant->id}/billplz/test")
            ->assertOk()
            ->assertJson(['ok' => false, 'reason' => 'unauthorized']);
    }

    public function test_connection_test_flags_an_unknown_collection(): void
    {
        Http::fake(['*' => Http::response(['error' => ['type' => 'RecordNotFound']], 404)]);
        [$admin, $tenant] = $this->configuredTenant();

        $this->actingAs($admin)
            ->postJson("/api/admin/operators/{$tenant->id}/billplz/test")
            ->assertJson(['ok' => false, 'reason' => 'collection_not_found']);
    }

    public function test_connection_test_handles_billplz_being_unreachable(): void
    {
        Http::fake(fn () => throw new ConnectionException('timeout'));
        [$admin, $tenant] = $this->configuredTenant();

        $this->actingAs($admin)
            ->postJson("/api/admin/operators/{$tenant->id}/billplz/test")
            ->assertOk()
            ->assertJson(['ok' => false, 'reason' => 'unreachable']);
    }

    public function test_connection_test_warns_when_the_same_key_was_pasted_twice(): void
    {
        Http::fake(['*' => Http::response(['title' => 'x'])]);
        [$admin, $tenant] = $this->configuredTenant(['x_signature_key' => 'plain-secret-key']);

        $this->actingAs($admin)
            ->postJson("/api/admin/operators/{$tenant->id}/billplz/test")
            ->assertJsonPath('warnings.0', 'x_signature_same_as_secret');
    }

    public function test_connection_test_requires_saved_credentials_and_a_platform_admin(): void
    {
        $admin = $this->createSaasAdmin();
        $tenant = $this->createTenant();
        $this->actingAs($admin)->postJson("/api/admin/operators/{$tenant->id}/billplz/test")->assertStatus(422);

        $operatorAdmin = $this->createOperatorAdmin($tenant);
        $this->actingAs($operatorAdmin)->postJson("/api/admin/operators/{$tenant->id}/billplz/test")->assertForbidden();
    }
}
