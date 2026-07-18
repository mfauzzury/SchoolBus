<?php

namespace Tests\Unit\Services;

use App\Enums\BillingPeriod;
use App\Models\BusOperator;
use App\Services\FeeCalculator;
use Tests\TestCase;

class FeeCalculatorTest extends TestCase
{
    private FeeCalculator $calculator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->calculator = new FeeCalculator;
    }

    public function test_matches_spec_worked_example(): void
    {
        // Route A, Return package, base fee = RM150/month, Yearly billing
        // => RM150 x 12 x (1 - 0.15) = RM1,530 (saves RM270)
        $tenant = new BusOperator;

        $result = $this->calculator->calculate($tenant, 150, BillingPeriod::Yearly);

        $this->assertSame(12, $result['months']);
        $this->assertSame(15.0, $result['billing_discount_rate']);
        $this->assertSame(1800.0, $result['amount_before_discount']);
        $this->assertSame(270.0, $result['discount_amount']);
        $this->assertSame(1530.0, $result['final_amount']);
    }

    public function test_monthly_billing_has_no_default_discount(): void
    {
        $tenant = new BusOperator;

        $result = $this->calculator->calculate($tenant, 100, BillingPeriod::Monthly);

        $this->assertSame(100.0, $result['amount_before_discount']);
        $this->assertSame(0.0, $result['discount_amount']);
        $this->assertSame(100.0, $result['final_amount']);
    }

    public function test_second_child_gets_sibling_discount_stacked_with_billing_discount(): void
    {
        $tenant = new BusOperator;

        // Quarterly (5% billing discount) + 2nd child (10% sibling discount)
        $result = $this->calculator->calculate($tenant, 100, BillingPeriod::Quarterly, childPosition: 2);

        $amountBeforeDiscount = 100 * 3; // 300
        $expectedFinal = round($amountBeforeDiscount * 0.95 * 0.90, 2); // 256.5

        $this->assertSame(5.0, $result['billing_discount_rate']);
        $this->assertSame(10.0, $result['sibling_discount_rate']);
        $this->assertSame($expectedFinal, $result['final_amount']);
    }

    public function test_sibling_discount_caps_at_third_tier_for_later_children(): void
    {
        $tenant = new BusOperator;

        $third = $this->calculator->calculate($tenant, 100, BillingPeriod::Monthly, childPosition: 3);
        $fifth = $this->calculator->calculate($tenant, 100, BillingPeriod::Monthly, childPosition: 5);

        $this->assertSame(15.0, $third['sibling_discount_rate']);
        $this->assertSame(15.0, $fifth['sibling_discount_rate']);
        $this->assertSame($third['final_amount'], $fifth['final_amount']);
    }

    public function test_operator_configured_discount_rates_override_defaults(): void
    {
        $tenant = new BusOperator([
            'discount_config' => [
                'billing_periods' => ['monthly' => 20],
            ],
        ]);

        $result = $this->calculator->calculate($tenant, 100, BillingPeriod::Monthly);

        $this->assertSame(20.0, $result['billing_discount_rate']);
        $this->assertSame(80.0, $result['final_amount']);
    }
}
