<?php

namespace App\Http\Controllers\Api\Operator;

use App\Enums\TransitLeg;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class BillingConfigController extends Controller
{
    public function show(Request $request)
    {
        return $request->user()->busOperator->resolvedBillingConfig();
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            // Capped at 28 so the due day exists in every month.
            'due_day' => 'sometimes|integer|min:1|max:28',
            'billed_months' => 'sometimes|array|min:1',
            'billed_months.*' => 'integer|distinct|min:1|max:12',
            'mode' => 'sometimes|in:auto,manual',
            'transit_prices' => 'sometimes|array:'.implode(',', TransitLeg::values()),
            'transit_prices.*' => 'nullable|numeric|min:0|max:99999',
        ]);

        if (isset($data['transit_prices'])) {
            // Merge leg by leg, so saving one price never wipes the others.
            $data['transit_prices'] = array_replace(
                $request->user()->busOperator->resolvedTransitPrices(),
                array_map(fn ($v) => $v === null ? null : (float) $v, $data['transit_prices']),
            );
        }

        $tenant = $request->user()->busOperator;

        $tenant->update([
            'billing_config' => array_replace($tenant->billing_config ?? [], $data),
        ]);

        return $tenant->resolvedBillingConfig();
    }
}
