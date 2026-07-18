<?php

namespace Tests\Feature\Operator;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class ProfileControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    public function test_admin_can_update_company_profile_and_bank_details(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        $response = $this->actingAs($admin)->putJson('/api/operator/profile', [
            'company_name' => 'New Name Sdn Bhd',
            'contact_person' => 'Jane',
            'contact_phone' => '0123456789',
            'email' => $tenant->email,
            'bank_details' => [
                'bank_name' => 'Maybank',
                'account_number' => '1234567890',
                'account_holder' => 'New Name Sdn Bhd',
            ],
        ]);

        $response->assertOk()->assertJsonPath('company_name', 'New Name Sdn Bhd');
        $this->assertSame('Maybank', $tenant->fresh()->bank_details['bank_name']);
    }

    public function test_email_must_be_unique_across_other_tenants(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $other = $this->createTenant(['email' => 'taken@test.com']);

        $this->actingAs($admin)->putJson('/api/operator/profile', [
            'company_name' => $tenant->company_name,
            'contact_person' => $tenant->contact_person,
            'contact_phone' => $tenant->contact_phone,
            'email' => 'taken@test.com',
        ])->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    public function test_updating_own_email_to_the_same_value_is_allowed(): void
    {
        $tenant = $this->createTenant(['email' => 'me@test.com']);
        $admin = $this->createOperatorAdmin($tenant);

        $this->actingAs($admin)->putJson('/api/operator/profile', [
            'company_name' => $tenant->company_name,
            'contact_person' => $tenant->contact_person,
            'contact_phone' => $tenant->contact_phone,
            'email' => 'me@test.com',
        ])->assertOk();
    }

    public function test_admin_can_upload_a_logo(): void
    {
        Storage::fake('public');
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        $response = $this->actingAs($admin)->post('/api/operator/profile/logo', [
            'logo' => UploadedFile::fake()->image('logo.png'),
        ]);

        $response->assertOk();
        $this->assertNotNull($tenant->fresh()->logo_path);
        Storage::disk('public')->assertExists($tenant->fresh()->logo_path);
    }

    public function test_uploading_a_new_logo_replaces_the_old_one(): void
    {
        Storage::fake('public');
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        $this->actingAs($admin)->post('/api/operator/profile/logo', ['logo' => UploadedFile::fake()->image('first.png')]);
        $firstPath = $tenant->fresh()->logo_path;

        $this->actingAs($admin)->post('/api/operator/profile/logo', ['logo' => UploadedFile::fake()->image('second.png')]);
        $secondPath = $tenant->fresh()->logo_path;

        $this->assertNotSame($firstPath, $secondPath);
        Storage::disk('public')->assertMissing($firstPath);
        Storage::disk('public')->assertExists($secondPath);
    }

    public function test_logo_upload_rejects_non_image_files(): void
    {
        Storage::fake('public');
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        $this->actingAs($admin)->post('/api/operator/profile/logo', [
            'logo' => UploadedFile::fake()->create('not-an-image.pdf', 100),
        ])->assertStatus(422)->assertJsonValidationErrors(['logo']);
    }

    public function test_staff_cannot_update_profile_or_upload_logo(): void
    {
        $tenant = $this->createTenant();
        $staff = $this->createOperatorStaff($tenant);

        $this->actingAs($staff)->putJson('/api/operator/profile', [
            'company_name' => 'X', 'contact_person' => 'X', 'contact_phone' => 'X', 'email' => 'x@x.com',
        ])->assertStatus(403);
    }
}
