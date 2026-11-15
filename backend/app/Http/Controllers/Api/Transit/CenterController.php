<?php

namespace App\Http\Controllers\Api\Transit;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * The transit center's own details and the leg prices it will see as an
 * indicative price when asking for a bus.
 */
class CenterController extends Controller
{
    public function show(Request $request)
    {
        $center = $request->user()->transitCenter;
        abort_unless($center?->isActive(), 403, 'This transit center is not active.');

        return [
            'id' => $center->id,
            'name' => $center->name,
            'contact_person' => $center->contact_person,
            'phone' => $center->phone,
            'email' => $center->email,
            'address' => $center->address,
            'operator' => $center->busOperator->only(['company_name', 'contact_phone', 'email']),
            'transit_prices' => $center->resolvedLegPrices(),
        ];
    }
}
