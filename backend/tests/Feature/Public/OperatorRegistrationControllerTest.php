<?php

namespace Tests\Feature\Public;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class OperatorRegistrationControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    public function test_signing_up_creates_a_tenant_and_admin_user_and_logs_in(): void
    {
        $this->ensureRole('operator_admin');

        $response = $this->fromFrontend()->postJson('/api/register-operator', [
            'company_name' => 'New Bus Co',
            'contact_person' => 'Jane Operator',
            'contact_phone' => '0123456789',
            'email' => 'jane@newbusco.test',
            'password' => 'password123',
            'email_token' => $this->verifyEmail('jane@newbusco.test'),
        ]);

        $response->assertCreated();
        $this->assertAuthenticated();

        $this->assertDatabaseHas('bus_operators', ['company_name' => 'New Bus Co']);
        $user = User::where('email', 'jane@newbusco.test')->first();
        $this->assertNotNull($user);
        $this->assertTrue($user->hasRole('operator_admin'));
        $this->assertNotNull($user->busOperator->operator_code);
        $this->assertSame(5, strlen($user->busOperator->operator_code));
    }

    public function test_signing_up_needs_a_verified_email(): void
    {
        $this->ensureRole('operator_admin');

        $this->fromFrontend()->postJson('/api/register-operator', [
            'company_name' => 'New Bus Co', 'contact_person' => 'Jane', 'contact_phone' => '0123456789',
            'email' => 'jane@newbusco.test', 'password' => 'password123',
        ])->assertStatus(422)->assertJsonValidationErrors(['email']);

        $this->assertDatabaseMissing('bus_operators', ['company_name' => 'New Bus Co']);
    }

    public function test_someone_elses_verification_cannot_be_used_without_the_proof_token(): void
    {
        $this->ensureRole('operator_admin');
        $this->verifyEmail('jane@newbusco.test');

        // Jane proved her email in her own browser. A stranger who only knows the address...
        $payload = [
            'company_name' => 'Hijack Co', 'contact_person' => 'Mallory', 'contact_phone' => '0123456789',
            'email' => 'jane@newbusco.test', 'password' => 'password123',
        ];
        $this->fromFrontend()->postJson('/api/register-operator', $payload)
            ->assertStatus(422)->assertJsonPath('errors.email.0', 'unverified');
        $this->fromFrontend()->postJson('/api/register-operator', [...$payload, 'email_token' => 'a-guess'])
            ->assertStatus(422)->assertJsonPath('errors.email.0', 'unverified');

        $this->assertDatabaseMissing('bus_operators', ['company_name' => 'Hijack Co']);
    }

    public function test_email_must_be_unique_across_users_and_tenants(): void
    {
        $tenant = $this->createTenant(['email' => 'taken@test.com']);

        $this->fromFrontend()->postJson('/api/register-operator', [
            'company_name' => 'X', 'contact_person' => 'X', 'contact_phone' => 'X',
            'email' => 'taken@test.com', 'password' => 'password123',
        ])->assertStatus(422)->assertJsonPath('errors.email.0', 'taken');
    }

    public function test_missing_fields_are_rejected(): void
    {
        $this->fromFrontend()->postJson('/api/register-operator', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['company_name', 'contact_person', 'contact_phone', 'email', 'password']);
    }

    public function test_two_operators_signing_up_get_different_operator_codes(): void
    {
        $this->ensureRole('operator_admin');

        $this->fromFrontend()->postJson('/api/register-operator', [
            'company_name' => 'A', 'contact_person' => 'A', 'contact_phone' => 'A',
            'email' => 'a@test.com', 'password' => 'password123',
            'email_token' => $this->verifyEmail('a@test.com'),
        ])->assertCreated();

        $codeA = User::where('email', 'a@test.com')->first()->busOperator->operator_code;

        $this->fromFrontend()->postJson('/api/register-operator', [
            'company_name' => 'B', 'contact_person' => 'B', 'contact_phone' => 'B',
            'email' => 'b@test.com', 'password' => 'password123',
            'email_token' => $this->verifyEmail('b@test.com'),
        ])->assertCreated();

        $codeB = User::where('email', 'b@test.com')->first()->busOperator->operator_code;

        $this->assertNotSame($codeA, $codeB);
    }

    public function test_password_must_contain_a_letter_and_a_number(): void
    {
        foreach (['abcdefghij', '1234567890'] as $password) {
            $this->postJson('/api/register-operator', [
                'company_name' => 'Weak Co', 'contact_person' => 'Weak', 'contact_phone' => '012',
                'email' => 'weak@test.com', 'password' => $password,
            ])->assertStatus(422)->assertJsonValidationErrors(['password']);
        }

        $this->assertDatabaseMissing('users', ['email' => 'weak@test.com']);
    }
}
