<?php

namespace Tests\Feature\Driver;

use App\Models\Staff;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class AuthControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private function provisionDriver(array $tenantAttributes = [], string $pin = '1234'): array
    {
        $this->ensureRole('driver');
        $tenant = $this->createTenant($tenantAttributes);
        $admin = $this->createOperatorAdmin($tenant);
        $staff = Staff::factory()->driver()->create(['tenant_id' => $tenant->id, 'phone' => '0123456789']);

        $this->actingAs($admin)
            ->postJson("/api/operator/staff/{$staff->id}/login", ['pin' => $pin])
            ->assertCreated();

        // actingAs() leaves the admin resolved on the 'web' guard for the rest
        // of the test; without clearing it, Sanctum's guard check (['web'] first,
        // bearer token as fallback) would keep authenticating as the admin and
        // never actually exercise the driver's bearer token below.
        $this->app['auth']->forgetGuards();

        return [$tenant, $staff->fresh()];
    }

    public function test_driver_can_log_in_and_token_round_trips_through_me(): void
    {
        [$tenant, $staff] = $this->provisionDriver(['operator_code' => '90010']);

        $response = $this->postJson('/api/driver/login', [
            'operator_code' => '90010',
            'phone' => '0123456789',
            'pin' => '1234',
        ]);

        $response->assertCreated()->assertJsonStructure(['token', 'user', 'staff']);
        $token = $response->json('token');

        $me = $this->withHeader('Authorization', "Bearer {$token}")->getJson('/api/me');

        $me->assertOk()
            ->assertJsonPath('tenant.id', $tenant->id)
            ->assertJsonPath('roles.0', 'driver');
    }

    public function test_login_fails_with_wrong_pin(): void
    {
        $this->provisionDriver(['operator_code' => '90020']);

        $this->postJson('/api/driver/login', [
            'operator_code' => '90020',
            'phone' => '0123456789',
            'pin' => '9999',
        ])->assertStatus(422);
    }

    public function test_login_fails_with_wrong_operator_code(): void
    {
        $this->provisionDriver(['operator_code' => '90030']);

        $this->postJson('/api/driver/login', [
            'operator_code' => '00000',
            'phone' => '0123456789',
            'pin' => '1234',
        ])->assertStatus(422);
    }

    public function test_login_fails_for_an_unprovisioned_driver(): void
    {
        $tenant = $this->createTenant(['operator_code' => '90040']);
        Staff::factory()->driver()->create(['tenant_id' => $tenant->id, 'phone' => '0198765432']);

        $this->postJson('/api/driver/login', [
            'operator_code' => '90040',
            'phone' => '0198765432',
            'pin' => '1234',
        ])->assertStatus(422);
    }

    public function test_driver_cannot_access_operator_routes(): void
    {
        $this->provisionDriver(['operator_code' => '90050']);

        $token = $this->postJson('/api/driver/login', [
            'operator_code' => '90050',
            'phone' => '0123456789',
            'pin' => '1234',
        ])->json('token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/operator/students')
            ->assertStatus(403);
    }

    public function test_login_succeeds_regardless_of_phone_number_formatting(): void
    {
        $this->ensureRole('driver');
        $tenant = $this->createTenant(['operator_code' => '90070']);
        $admin = $this->createOperatorAdmin($tenant);
        // Operator entered the number with dashes and a space when adding staff.
        $staff = Staff::factory()->driver()->create(['tenant_id' => $tenant->id, 'phone' => '012-345 6789']);
        $this->actingAs($admin)
            ->postJson("/api/operator/staff/{$staff->id}/login", ['pin' => '1234'])
            ->assertCreated();
        $this->app['auth']->forgetGuards();

        // Driver types it back in with no punctuation at all.
        $this->postJson('/api/driver/login', [
            'operator_code' => '90070',
            'phone' => '0123456789',
            'pin' => '1234',
        ])->assertCreated();
    }

    public function test_driver_can_log_out_and_revokes_the_token(): void
    {
        $this->provisionDriver(['operator_code' => '90060']);

        $token = $this->postJson('/api/driver/login', [
            'operator_code' => '90060',
            'phone' => '0123456789',
            'pin' => '1234',
        ])->json('token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/driver/logout')
            ->assertOk();

        // Same guard-caching artifact as provisionDriver()'s forgetGuards() call:
        // Sanctum resolves and caches the user on the guard for this request:
        // without resetting it, the next call reuses that cached resolution
        // instead of re-checking the (now-deleted) token.
        $this->app['auth']->forgetGuards();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/me')
            ->assertStatus(401);
    }
}
