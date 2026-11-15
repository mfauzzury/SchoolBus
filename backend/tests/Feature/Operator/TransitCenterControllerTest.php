<?php

namespace Tests\Feature\Operator;

use App\Models\TransitCenter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

/** Operators see their transit centers; only the platform team adds or changes them. */
class TransitCenterControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    public function test_an_operator_sees_only_its_own_centers_and_cannot_add_or_change_them(): void
    {
        $tenant = $this->createTenant();
        $other = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $mine = TransitCenter::create(['tenant_id' => $tenant->id, 'name' => 'Bright Kids TC', 'phone' => '03-1', 'email' => 'a@tc.my', 'status' => 'active']);
        TransitCenter::create(['tenant_id' => $other->id, 'name' => 'Not mine', 'phone' => '03-2', 'email' => 'b@tc.my', 'status' => 'active']);

        $this->actingAs($admin)->getJson('/api/operator/transit-centers')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Bright Kids TC')
            ->assertJsonPath('0.has_login', false)
            ->assertJsonMissingPath('0.email');

        $this->actingAs($admin)->postJson('/api/operator/transit-centers', ['name' => 'X'])->assertMethodNotAllowed();
        $this->actingAs($admin)->putJson("/api/operator/transit-centers/{$mine->id}", ['name' => 'X'])->assertNotFound();
        $this->actingAs($admin)->postJson("/api/operator/transit-centers/{$mine->id}/login")->assertNotFound();
    }

    public function test_admin_sets_the_monthly_price_for_each_transit_leg(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        $this->actingAs($admin)->getJson('/api/operator/billing-config')
            ->assertOk()
            ->assertJsonPath('transit_prices.school_to_center', null);

        $this->actingAs($admin)->putJson('/api/operator/billing-config', [
            'transit_prices' => ['school_to_center' => 40, 'center_to_home' => 60],
        ])->assertOk()
            ->assertJsonPath('transit_prices.school_to_center', 40)
            ->assertJsonPath('transit_prices.center_to_home', 60)
            ->assertJsonPath('transit_prices.home_to_center', null);

        // Saving one price later keeps the others.
        $this->actingAs($admin)->putJson('/api/operator/billing-config', [
            'transit_prices' => ['home_to_center' => 45],
        ])->assertOk()
            ->assertJsonPath('transit_prices.school_to_center', 40)
            ->assertJsonPath('transit_prices.home_to_center', 45);

        $this->actingAs($admin)->putJson('/api/operator/billing-config', [
            'transit_prices' => ['to_the_moon' => 1],
        ])->assertUnprocessable();
    }
}
