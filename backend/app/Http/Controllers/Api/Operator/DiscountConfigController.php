<?php

namespace App\Http\Controllers\Api\Operator;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class DiscountConfigController extends Controller
{
    public function show(Request $request)
    {
        return $request->user()->busOperator->resolvedDiscountConfig();
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'sibling_discounts' => 'sometimes|array',
            'sibling_discounts.1' => 'sometimes|numeric|min:0|max:100',
            'sibling_discounts.2' => 'sometimes|numeric|min:0|max:100',
            'sibling_discounts.3' => 'sometimes|numeric|min:0|max:100',
        ]);

        $tenant = $request->user()->busOperator;
        $existing = $tenant->discount_config ?? [];

        $tenant->update([
            'discount_config' => [
                // array_replace (not array_merge) — numeric sibling-tier keys would
                // otherwise be silently reindexed from 0.
                'sibling_discounts' => array_replace(
                    $existing['sibling_discounts'] ?? [],
                    $data['sibling_discounts'] ?? [],
                ),
            ],
        ]);

        return $tenant->resolvedDiscountConfig();
    }
}
