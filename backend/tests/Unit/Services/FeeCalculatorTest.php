<?php

namespace Tests\Unit\Services;

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

    public function test_first_child_pays_the_full_monthly_fee(): void
    {
        $result = $this->calculator->calculate(new BusOperator, 150);

        $this->assertSame(0.0, $result['sibling_discount_rate']);
        $this->assertSame(150.0, $result['amount_before_discount']);
        $this->assertSame(0.0, $result['discount_amount']);
        $this->assertSame(150.0, $result['final_amount']);
    }

    public function test_second_child_gets_the_sibling_discount(): void
    {
        $result = $this->calculator->calculate(new BusOperator, 100, childPosition: 2);

        $this->assertSame(10.0, $result['sibling_discount_rate']);
        $this->assertSame(100.0, $result['amount_before_discount']);
        $this->assertSame(10.0, $result['discount_amount']);
        $this->assertSame(90.0, $result['final_amount']);
    }

    public function test_sibling_discount_caps_at_third_tier_for_later_children(): void
    {
        $tenant = new BusOperator;

        $third = $this->calculator->calculate($tenant, 100, childPosition: 3);
        $fifth = $this->calculator->calculate($tenant, 100, childPosition: 5);

        $this->assertSame(15.0, $third['sibling_discount_rate']);
        $this->assertSame(15.0, $fifth['sibling_discount_rate']);
        $this->assertSame($third['final_amount'], $fifth['final_amount']);
    }

    public function test_operator_configured_discount_rates_override_defaults(): void
    {
        $tenant = new BusOperator([
            'discount_config' => [
                'sibling_discounts' => ['2' => 25],
            ],
        ]);

        $result = $this->calculator->calculate($tenant, 100, childPosition: 2);

        $this->assertSame(25.0, $result['sibling_discount_rate']);
        $this->assertSame(75.0, $result['final_amount']);
    }

    public function test_a_custom_fee_is_charged_exactly_with_no_sibling_discount(): void
    {
        $result = $this->calculator->calculate(new BusOperator, 80, childPosition: 2, isCustomFee: true);

        $this->assertSame(0.0, $result['sibling_discount_rate']);
        $this->assertSame(0.0, $result['discount_amount']);
        $this->assertSame(80.0, $result['final_amount']);
    }
}
