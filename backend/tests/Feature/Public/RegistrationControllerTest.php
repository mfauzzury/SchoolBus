<?php

namespace Tests\Feature\Public;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class RegistrationControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    public function test_show_returns_tenant_info_for_a_valid_operator_code(): void
    {
        $tenant = $this->createTenant(['company_name' => 'Demo Bus Co', 'operator_code' => '1000']);

        $this->getJson('/api/register/1000')
            ->assertOk()
            ->assertJsonPath('company_name', 'Demo Bus Co');
    }

    public function test_show_404s_for_an_unknown_operator_code(): void
    {
        $this->getJson('/api/register/9999')->assertStatus(404);
    }

    public function test_registering_creates_a_parent_user_and_profile_and_logs_in(): void
    {
        $this->ensureRole('parent');
        $tenant = $this->createTenant(['operator_code' => '1000']);

        $response = $this->fromFrontend()->postJson('/api/register/1000', [
            'full_name' => 'Parent One',
            'ic_number' => '900101-01-1111',
            'phone' => '0123456789',
            'email' => 'parent1@test.com',
            'password' => 'password123',
        ]);

        $response->assertCreated();
        $this->assertAuthenticated();
        $this->assertDatabaseHas('users', ['email' => 'parent1@test.com', 'tenant_id' => $tenant->id]);
        $this->assertDatabaseHas('parents', ['email' => 'parent1@test.com', 'tenant_id' => $tenant->id]);

        $user = \App\Models\User::where('email', 'parent1@test.com')->first();
        $this->assertTrue($user->hasRole('parent'));
    }

    public function test_registration_requires_a_valid_operator_code(): void
    {
        $this->fromFrontend()->postJson('/api/register/9999', [
            'full_name' => 'X', 'ic_number' => 'X', 'phone' => 'X',
            'email' => 'x@test.com', 'password' => 'password123',
        ])->assertStatus(404);
    }

    public function test_email_must_be_unique(): void
    {
        $tenant = $this->createTenant(['operator_code' => '1000']);
        $this->createOperatorAdmin($tenant, ['email' => 'taken@test.com']);

        $this->fromFrontend()->postJson('/api/register/1000', [
            'full_name' => 'X', 'ic_number' => 'X', 'phone' => 'X',
            'email' => 'taken@test.com', 'password' => 'password123',
        ])->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    public function test_password_must_be_at_least_8_characters(): void
    {
        $this->createTenant(['operator_code' => '1000']);

        $this->fromFrontend()->postJson('/api/register/1000', [
            'full_name' => 'X', 'ic_number' => 'X', 'phone' => 'X',
            'email' => 'x@test.com', 'password' => 'short',
        ])->assertStatus(422)->assertJsonValidationErrors(['password']);
    }
}
