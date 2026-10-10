<?php

namespace Tests\Feature\ParentPortal;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class AuthControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    public function test_parent_can_log_in_and_use_the_token_on_parent_routes(): void
    {
        $tenant = $this->createTenant();
        [$user] = $this->createParent($tenant, ['email' => 'mum@example.test']);

        $response = $this->postJson('/api/parent/login', [
            'email' => 'mum@example.test',
            'password' => 'password',
            'device_name' => 'iPhone 15',
        ]);

        $response->assertCreated()->assertJsonStructure(['token', 'user', 'parentProfile']);
        $this->assertSame('iPhone 15', $user->tokens()->first()->name);

        $auth = ['Authorization' => 'Bearer '.$response->json('token')];

        $this->withHeaders($auth)->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('tenant.id', $tenant->id)
            ->assertJsonPath('roles.0', 'parent');

        $this->withHeaders($auth)->getJson('/api/parent/students')->assertOk();
    }

    public function test_login_fails_with_wrong_password(): void
    {
        $this->createParent($this->createTenant(), ['email' => 'mum@example.test']);

        $this->postJson('/api/parent/login', [
            'email' => 'mum@example.test',
            'password' => 'wrong-password',
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_login_fails_for_unknown_email(): void
    {
        $this->postJson('/api/parent/login', [
            'email' => 'nobody@example.test',
            'password' => 'password',
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_non_parent_accounts_cannot_get_a_parent_app_token(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant, ['email' => 'boss@example.test']);

        $this->postJson('/api/parent/login', [
            'email' => 'boss@example.test',
            'password' => 'password',
        ])->assertStatus(422);

        $this->assertCount(0, $admin->tokens);
    }

    public function test_logout_revokes_only_the_current_token(): void
    {
        [$user] = $this->createParent($this->createTenant(), ['email' => 'mum@example.test']);

        $phone = $this->postJson('/api/parent/login', ['email' => 'mum@example.test', 'password' => 'password'])->json('token');
        $this->postJson('/api/parent/login', ['email' => 'mum@example.test', 'password' => 'password']);
        $this->assertCount(2, $user->tokens);

        $this->withHeader('Authorization', "Bearer {$phone}")
            ->postJson('/api/parent/logout')
            ->assertOk();

        $this->assertCount(1, $user->fresh()->tokens);
    }
}
