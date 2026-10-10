<?php

namespace Tests\Feature\ParentPortal;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class ProfileControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    public function test_parent_can_change_their_own_password(): void
    {
        $tenant = $this->createTenant();
        [$user] = $this->createParent($tenant, ['password' => 'old-password']);

        $response = $this->actingAs($user)->putJson('/api/parent/profile/password', [
            'current_password' => 'old-password',
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ]);

        $response->assertOk();
        $this->assertTrue(Hash::check('new-password-123', $user->fresh()->password));
    }

    public function test_current_password_must_be_correct(): void
    {
        $tenant = $this->createTenant();
        [$user] = $this->createParent($tenant, ['password' => 'old-password']);

        $response = $this->actingAs($user)->putJson('/api/parent/profile/password', [
            'current_password' => 'wrong-password',
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['current_password']);
        $this->assertTrue(Hash::check('old-password', $user->fresh()->password));
    }

    public function test_new_password_must_be_confirmed(): void
    {
        $tenant = $this->createTenant();
        [$user] = $this->createParent($tenant, ['password' => 'old-password']);

        $response = $this->actingAs($user)->putJson('/api/parent/profile/password', [
            'current_password' => 'old-password',
            'password' => 'new-password-123',
            'password_confirmation' => 'does-not-match',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['password']);
    }

    public function test_new_password_must_meet_minimum_length(): void
    {
        $tenant = $this->createTenant();
        [$user] = $this->createParent($tenant, ['password' => 'old-password']);

        $response = $this->actingAs($user)->putJson('/api/parent/profile/password', [
            'current_password' => 'old-password',
            'password' => 'short',
            'password_confirmation' => 'short',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['password']);
    }

    public function test_operator_cannot_use_the_parent_password_endpoint(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        $this->actingAs($admin)->putJson('/api/parent/profile/password', [
            'current_password' => 'whatever',
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ])->assertStatus(403);
    }
}
