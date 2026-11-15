<?php

namespace Tests\Feature\Transit;

use App\Models\TransitCenter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class CenterControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private function centerLogin(array $centerOverrides = []): array
    {
        $tenant = $this->createTenant();
        $this->ensureRole('transit_center');
        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $user->assignRole('transit_center');
        $center = TransitCenter::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'name' => 'Bright Kids TC',
            'phone' => '012-345 6789',
            'email' => $user->email,
            'status' => 'active',
            'monthly_price' => 100,
            ...$centerOverrides,
        ]);

        return [$user, $center];
    }

    public function test_a_center_sees_its_details_and_its_monthly_price(): void
    {
        [$user] = $this->centerLogin();

        $this->actingAs($user)->getJson('/api/transit/center')
            ->assertOk()
            ->assertJsonPath('name', 'Bright Kids TC')
            ->assertJsonPath('monthly_price', 100);

        $this->actingAs($user)->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('transitCenter.name', 'Bright Kids TC');
    }

    public function test_a_switched_off_center_is_refused(): void
    {
        [$user] = $this->centerLogin(['status' => 'inactive']);

        $this->actingAs($user)->getJson('/api/transit/center')->assertForbidden();
    }

    public function test_other_logins_cannot_use_the_transit_portal_and_a_center_cannot_use_the_operator_portal(): void
    {
        [$user, $center] = $this->centerLogin();
        $admin = $this->createOperatorAdmin($center->busOperator);

        $this->actingAs($admin)->getJson('/api/transit/center')->assertForbidden();
        $this->actingAs($user)->getJson('/api/operator/students')->assertForbidden();
    }
}
