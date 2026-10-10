<?php

namespace App\Http\Controllers\Api\Operator;

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
        ]);

        $tenant = $request->user()->busOperator;

        $tenant->update([
            'billing_config' => array_replace($tenant->billing_config ?? [], $data),
        ]);

        return $tenant->resolvedBillingConfig();
    }
}
