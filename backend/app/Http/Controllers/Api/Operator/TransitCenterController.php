<?php

namespace App\Http\Controllers\Api\Operator;

use App\Enums\TransitLeg;
use App\Http\Controllers\Controller;
use App\Models\TransitCenter;
use Illuminate\Http\Request;

/**
 * The transit centers that work with this operator. Centers are added and
 * changed by the platform team (Admin\TransitCenterController); what the
 * operator does here is set what each center is charged for each part of the day.
 */
class TransitCenterController extends Controller
{
    public function index()
    {
        return TransitCenter::orderBy('name')->get()->map(fn (TransitCenter $center) => $this->present($center));
    }

    public function show(TransitCenter $transitCenter)
    {
        return $this->present($transitCenter);
    }

    /**
     * Sets this center's monthly add-on per part of the day. Prices sent
     * replace the saved ones; a price left out keeps its saved value, and
     * null clears one. The center sees these as an estimate; the operator
     * still sets the final price when approving each request.
     */
    public function updatePrices(Request $request, TransitCenter $transitCenter)
    {
        $data = $request->validate([
            'leg_prices' => 'required|array:'.implode(',', TransitLeg::values()),
            'leg_prices.*' => 'nullable|numeric|min:0|max:99999',
        ]);

        $transitCenter->update([
            'leg_prices' => array_replace(
                $transitCenter->resolvedLegPrices(),
                array_map(fn ($price) => $price === null ? null : round((float) $price, 2), $data['leg_prices']),
            ),
        ]);

        return $this->present($transitCenter->fresh());
    }

    private function present(TransitCenter $center): array
    {
        return [
            'id' => $center->id,
            'name' => $center->name,
            'contact_person' => $center->contact_person,
            'phone' => $center->phone,
            'address' => $center->address,
            'status' => $center->status,
            'has_login' => $center->user_id !== null,
            'leg_prices' => $center->resolvedLegPrices(),
        ];
    }
}
