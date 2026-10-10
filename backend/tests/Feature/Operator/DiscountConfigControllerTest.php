<?php

namespace Tests\Feature\Operator;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class DiscountConfigControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    public function test_unset_tenant_gets_the_spec_default_rates(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        $response = $this->actingAs($admin)->getJson('/api/operator/discount-config');

        $response->assertOk()
            ->assertJsonPath('sibling_discounts.1', 0)
            ->assertJsonPath('sibling_discounts.2', 10)
            ->assertJsonPath('sibling_discounts.3', 15)
            // Paying ahead (quarterly/yearly) is gone, and so are its discounts.
            ->assertJsonMissingPath('billing_periods');
    }

    public function test_admin_can_partially_update_rates_without_losing_the_rest(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        $this->actingAs($admin)->putJson('/api/operator/discount-config', [
            'sibling_discounts' => ['2' => 20],
        ])->assertOk();

        // array_replace, not array_merge — sibling tier keys ('1','2','3') are
        // numeric strings and would otherwise get silently reindexed from 0.
        $response = $this->actingAs($admin)->getJson('/api/operator/discount-config');

        $response->assertOk()
            ->assertJsonPath('sibling_discounts.1', 0)
            ->assertJsonPath('sibling_discounts.2', 20)
            ->assertJsonPath('sibling_discounts.3', 15);
    }

    public function test_rates_must_be_between_0_and_100(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);

        $this->actingAs($admin)->putJson('/api/operator/discount-config', [
            'sibling_discounts' => ['2' => 150],
        ])->assertStatus(422)->assertJsonValidationErrors(['sibling_discounts.2']);
    }

    public function test_staff_can_view_but_not_update_discount_config(): void
    {
        $tenant = $this->createTenant();
        $staff = $this->createOperatorStaff($tenant);

        $this->actingAs($staff)->getJson('/api/operator/discount-config')->assertOk();
        $this->actingAs($staff)->putJson('/api/operator/discount-config', ['sibling_discounts' => ['2' => 5]])
            ->assertStatus(403);
    }
}
