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
        $this->actingAs($admin)->putJson("/api/operator/transit-centers/{$mine->id}", ['name' => 'X'])->assertMethodNotAllowed();
        $this->actingAs($admin)->postJson("/api/operator/transit-centers/{$mine->id}/login")->assertNotFound();
    }

    private function center(\App\Models\BusOperator $tenant, string $name = 'Bright Kids TC', array $attributes = []): TransitCenter
    {
        return TransitCenter::create([
            'tenant_id' => $tenant->id, 'name' => $name, 'phone' => '03-1', 'email' => strtolower(str_replace(' ', '', $name)).'@tc.my', 'status' => 'active',
            ...$attributes,
        ]);
    }

    public function test_the_operator_sets_each_centers_own_price_for_each_part_of_the_day(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $bright = $this->center($tenant);
        $smart = $this->center($tenant, 'Smart Tuition');

        $this->actingAs($admin)->getJson('/api/operator/transit-centers')
            ->assertOk()
            ->assertJsonPath('0.leg_prices.school_to_center', null);

        $this->actingAs($admin)->putJson("/api/operator/transit-centers/{$bright->id}/prices", [
            'leg_prices' => ['school_to_center' => 40, 'center_to_home' => 60],
        ])->assertOk()
            ->assertJsonPath('leg_prices.school_to_center', 40)
            ->assertJsonPath('leg_prices.center_to_home', 60)
            ->assertJsonPath('leg_prices.home_to_center', null);

        // Another center of the same operator keeps its own prices.
        $this->actingAs($admin)->putJson("/api/operator/transit-centers/{$smart->id}/prices", [
            'leg_prices' => ['school_to_center' => 25.5],
        ])->assertOk()->assertJsonPath('leg_prices.school_to_center', 25.5);
        $this->assertSame(40.0, $bright->fresh()->resolvedLegPrices()['school_to_center']);

        // A price left out keeps its value; null clears one.
        $this->actingAs($admin)->putJson("/api/operator/transit-centers/{$bright->id}/prices", [
            'leg_prices' => ['home_to_center' => 45, 'center_to_home' => null],
        ])->assertOk()
            ->assertJsonPath('leg_prices.school_to_center', 40)
            ->assertJsonPath('leg_prices.home_to_center', 45)
            ->assertJsonPath('leg_prices.center_to_home', null);
    }

    public function test_prices_must_be_known_legs_and_not_negative(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $center = $this->center($tenant);

        $this->actingAs($admin)->putJson("/api/operator/transit-centers/{$center->id}/prices", ['leg_prices' => ['to_the_moon' => 1]])->assertUnprocessable();
        $this->actingAs($admin)->putJson("/api/operator/transit-centers/{$center->id}/prices", ['leg_prices' => ['school_to_center' => -5]])->assertUnprocessable();
        $this->actingAs($admin)->putJson("/api/operator/transit-centers/{$center->id}/prices", [])->assertUnprocessable();
    }

    public function test_only_the_owner_sets_prices_and_only_for_its_own_centers(): void
    {
        $tenant = $this->createTenant();
        $staff = $this->createOperatorStaff($tenant);
        $mine = $this->center($tenant);
        $theirs = $this->center($this->createTenant(), 'Not mine');
        $admin = $this->createOperatorAdmin($tenant);

        $this->actingAs($staff)->putJson("/api/operator/transit-centers/{$mine->id}/prices", ['leg_prices' => ['school_to_center' => 1]])->assertForbidden();
        $this->actingAs($staff)->getJson("/api/operator/transit-centers/{$mine->id}")->assertOk();
        $this->actingAs($admin)->putJson("/api/operator/transit-centers/{$theirs->id}/prices", ['leg_prices' => ['school_to_center' => 1]])->assertNotFound();
    }

    public function test_the_billing_settings_no_longer_carry_transit_prices(): void
    {
        $admin = $this->createOperatorAdmin($this->createTenant());

        $this->actingAs($admin)->getJson('/api/operator/billing-config')->assertOk()->assertJsonMissingPath('transit_prices');
    }
}
