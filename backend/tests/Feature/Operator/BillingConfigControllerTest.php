<?php

namespace Tests\Feature\Operator;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class BillingConfigControllerTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    public function test_unset_tenant_bills_every_month_due_on_the_7th(): void
    {
        $admin = $this->createOperatorAdmin($this->createTenant());

        $this->actingAs($admin)->getJson('/api/operator/billing-config')
            ->assertOk()
            ->assertJsonPath('due_day', 7)
            ->assertJsonPath('billed_months', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    }

    public function test_admin_can_change_one_setting_without_losing_the_other(): void
    {
        $admin = $this->createOperatorAdmin($this->createTenant());

        $this->actingAs($admin)->putJson('/api/operator/billing-config', ['billed_months' => [11, 1, 2]])->assertOk();
        $this->actingAs($admin)->putJson('/api/operator/billing-config', ['due_day' => 10])
            ->assertOk()
            ->assertJsonPath('due_day', 10)
            ->assertJsonPath('billed_months', [1, 2, 11]);
    }

    public function test_settings_are_validated(): void
    {
        $admin = $this->createOperatorAdmin($this->createTenant());

        // The 31st doesn't exist in every month.
        $this->actingAs($admin)->putJson('/api/operator/billing-config', ['due_day' => 31])
            ->assertStatus(422)->assertJsonValidationErrors(['due_day']);
        $this->actingAs($admin)->putJson('/api/operator/billing-config', ['billed_months' => [0, 13]])
            ->assertStatus(422)->assertJsonValidationErrors(['billed_months.0', 'billed_months.1']);
        $this->actingAs($admin)->putJson('/api/operator/billing-config', ['billed_months' => []])
            ->assertStatus(422)->assertJsonValidationErrors(['billed_months']);
    }

    public function test_staff_can_view_but_not_update_billing_config(): void
    {
        $staff = $this->createOperatorStaff($this->createTenant());

        $this->actingAs($staff)->getJson('/api/operator/billing-config')->assertOk();
        $this->actingAs($staff)->putJson('/api/operator/billing-config', ['due_day' => 5])->assertStatus(403);
    }
}
