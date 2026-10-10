<?php

namespace App\Services;

use App\Models\BusOperator;

class FeeCalculator
{
    /**
     * Final Amount = Monthly Fee x (1 - Sibling Discount)
     *
     * The sibling discount is a tenant-configurable percentage (spec §3.4).
     * A fee the operator set by hand for one child is charged exactly as
     * entered — no discount is taken off it a second time.
     *
     * @param  int  $childPosition  1st, 2nd, 3rd+ child of the same parent (1-indexed)
     */
    public function calculate(
        BusOperator $tenant,
        float $monthlyFee,
        int $childPosition = 1,
        bool $isCustomFee = false,
    ): array {
        $siblingDiscountRate = $isCustomFee
            ? 0.0
            : $this->siblingDiscountRate($tenant->resolvedDiscountConfig(), $childPosition);

        $amountBeforeDiscount = round($monthlyFee, 2);
        $finalAmount = round($amountBeforeDiscount * (1 - $siblingDiscountRate / 100), 2);
        $discountAmount = round($amountBeforeDiscount - $finalAmount, 2);

        return [
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
