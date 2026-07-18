<?php

namespace App\Services;

use App\Enums\BillingPeriod;
use App\Models\BusOperator;

class FeeCalculator
{
    /**
     * Final Amount = Base Monthly Fee x Months x (1 - Billing Discount) x (1 - Sibling Discount)
     *
     * Sibling discount stacks multiplicatively on top of the billing period discount,
     * both expressed as tenant-configurable percentages (spec §3.2-3.4).
     *
     * @param  int  $childPosition  1st, 2nd, 3rd+ child of the same parent (1-indexed)
     */
    public function calculate(
        BusOperator $tenant,
        float $baseMonthlyFee,
        BillingPeriod $billingPeriod,
        int $childPosition = 1,
    ): array {
        $config = $tenant->resolvedDiscountConfig();

        $months = $billingPeriod->months();
        $billingDiscountRate = (float) ($config['billing_periods'][$billingPeriod->value] ?? 0);
        $siblingDiscountRate = $this->siblingDiscountRate($config, $childPosition);

        $amountBeforeDiscount = round($baseMonthlyFee * $months, 2);
        $finalAmount = round(
            $amountBeforeDiscount * (1 - $billingDiscountRate / 100) * (1 - $siblingDiscountRate / 100),
            2,
        );
        $discountAmount = round($amountBeforeDiscount - $finalAmount, 2);

        return [
            'months' => $months,
            'billing_discount_rate' => $billingDiscountRate,
            'sibling_discount_rate' => $siblingDiscountRate,
            'amount_before_discount' => $amountBeforeDiscount,
            'discount_amount' => $discountAmount,
            'final_amount' => $finalAmount,
        ];
    }

    private function siblingDiscountRate(array $config, int $childPosition): float
    {
        $siblingDiscounts = $config['sibling_discounts'];
        $maxTier = max(array_map('intval', array_keys($siblingDiscounts)));
        $tier = min($childPosition, $maxTier);

        return (float) ($siblingDiscounts[(string) $tier] ?? 0);
    }
}
