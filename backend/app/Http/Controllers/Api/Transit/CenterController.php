<?php

namespace App\Http\Controllers\Api\Transit;

use App\Http\Controllers\Api\Transit\Concerns\ActsAsTransitCenter;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * The transit center's own details and the monthly price it will see as an
 * estimate when asking for a bus.
 */
class CenterController extends Controller
{
    use ActsAsTransitCenter;

    public function show(Request $request)
    {
        $center = $this->center($request);

        return [
            'id' => $center->id,
            'name' => $center->name,
            'contact_person' => $center->contact_person,
            'phone' => $center->phone,
            'email' => $center->email,
            'address' => $center->address,
            'operator' => $center->busOperator->only(['company_name', 'contact_phone', 'email']),
            // What the operator charges a child per month for going via this center; null = not set yet.
            'monthly_price' => $center->monthly_price === null ? null : (float) $center->monthly_price,
        ];
    }
}
