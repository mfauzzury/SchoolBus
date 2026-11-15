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
            ->assertJsonMissingPath('0.has_login')
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

    public function test_the_operator_sets_one_monthly_price_for_each_center(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $bright = $this->center($tenant);
        $smart = $this->center($tenant, 'Smart Tuition');

        $this->actingAs($admin)->getJson('/api/operator/transit-centers')
            ->assertOk()
            ->assertJsonPath('0.monthly_price', null);

        $this->actingAs($admin)->putJson("/api/operator/transit-centers/{$bright->id}/price", ['monthly_price' => 100])
            ->assertOk()
            ->assertJsonPath('monthly_price', 100);

        // Another center of the same operator keeps its own price.
        $this->actingAs($admin)->putJson("/api/operator/transit-centers/{$smart->id}/price", ['monthly_price' => 75.5])
            ->assertOk()
            ->assertJsonPath('monthly_price', 75.5);
        $this->assertSame('100.00', $bright->fresh()->monthly_price);

        // Null clears it.
        $this->actingAs($admin)->putJson("/api/operator/transit-centers/{$bright->id}/price", ['monthly_price' => null])
            ->assertOk()
            ->assertJsonPath('monthly_price', null);
    }

    public function test_the_price_must_be_sent_and_not_negative(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $center = $this->center($tenant);

        $this->actingAs($admin)->putJson("/api/operator/transit-centers/{$center->id}/price", ['monthly_price' => -5])->assertUnprocessable();
        $this->actingAs($admin)->putJson("/api/operator/transit-centers/{$center->id}/price", ['monthly_price' => 'abc'])->assertUnprocessable();
        $this->actingAs($admin)->putJson("/api/operator/transit-centers/{$center->id}/price", [])->assertUnprocessable();
    }

    public function test_only_the_owner_sets_prices_and_only_for_its_own_centers(): void
    {
        $tenant = $this->createTenant();
        $staff = $this->createOperatorStaff($tenant);
        $mine = $this->center($tenant);
        $theirs = $this->center($this->createTenant(), 'Not mine');
        $admin = $this->createOperatorAdmin($tenant);

        $this->actingAs($staff)->putJson("/api/operator/transit-centers/{$mine->id}/price", ['monthly_price' => 1])->assertForbidden();
        $this->actingAs($staff)->getJson("/api/operator/transit-centers/{$mine->id}")->assertOk();
        $this->actingAs($admin)->putJson("/api/operator/transit-centers/{$theirs->id}/price", ['monthly_price' => 1])->assertNotFound();
    }

    public function test_the_billing_settings_no_longer_carry_transit_prices(): void
    {
        $admin = $this->createOperatorAdmin($this->createTenant());

        $this->actingAs($admin)->getJson('/api/operator/billing-config')->assertOk()->assertJsonMissingPath('transit_prices');
    }
}
