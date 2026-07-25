<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    public function test_user_can_log_in_with_correct_credentials(): void
    {
        $tenant = $this->createTenant();
        $this->createOperatorAdmin($tenant, ['email' => 'admin@test.com', 'password' => 'password']);

        $response = $this->fromFrontend()->postJson('/api/login', [
            'email' => 'admin@test.com',
            'password' => 'password',
        ]);

        $response->assertOk();
        $this->assertAuthenticated();
    }

    public function test_login_fails_with_wrong_password(): void
    {
        $tenant = $this->createTenant();
        $this->createOperatorAdmin($tenant, ['email' => 'admin@test.com', 'password' => 'password']);

        $response = $this->fromFrontend()->postJson('/api/login', [
            'email' => 'admin@test.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422);
        $this->assertGuest();
    }

    public function test_me_returns_user_tenant_and_roles(): void
    {
        $tenant = $this->createTenant(['company_name' => 'Acme Buses']);
        $admin = $this->createOperatorAdmin($tenant);

        $response = $this->actingAs($admin)->getJson('/api/me');

        $response->assertOk()
            ->assertJsonPath('user.id', $admin->id)
            ->assertJsonPath('tenant.company_name', 'Acme Buses')
            ->assertJsonPath('roles.0', 'operator_admin');
    }

    public function test_me_is_rejected_when_unauthenticated(): void
    {
        $this->getJson('/api/me')->assertStatus(401);
    }

    public function test_me_succeeds_for_a_user_without_a_tenant(): void
    {
        // /me sits outside the `tenant` middleware group specifically so
        // tenant-less users (saas_admin) can call it right after login —
        // it should return a null tenant, not be blocked by EnsureTenant.
        $user = \App\Models\User::factory()->create(['tenant_id' => null]);

        $response = $this->actingAs($user)->getJson('/api/me');

        $response->assertOk()->assertJsonPath('tenant', null);
    }

    public function test_logout_succeeds_for_an_authenticated_user(): void
    {
        // End-to-end cookie invalidation is covered by manual browser testing;
        // PHPUnit's test client doesn't round-trip real session cookies between
        // calls, so here we just verify the endpoint itself behaves correctly.
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        $this->fromFrontend()->actingAs($admin)->postJson('/api/logout')
            ->assertOk()
            ->assertJson(['message' => 'Logged out']);
    }
}
