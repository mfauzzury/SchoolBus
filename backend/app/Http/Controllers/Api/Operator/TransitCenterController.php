<?php

namespace App\Http\Controllers\Api\Operator;

use App\Http\Controllers\Controller;
use App\Models\TransitCenter;
use Illuminate\Http\Request;

/**
 * The transit centers that work with this operator. Centers are added and
 * changed by the platform team (Admin\TransitCenterController); what the
 * operator does here is set what each center is charged per month.
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
     * Sets what this center is charged per child each month, whichever parts
     * of the day the bus covers. The center sees it as an estimate; the
     * operator still sets the final price when approving each request. Null
     * clears it.
     */
    public function updatePrice(Request $request, TransitCenter $transitCenter)
    {
        $data = $request->validate([
            'monthly_price' => 'present|nullable|numeric|min:0|max:99999',
        ]);

        $transitCenter->update([
            'monthly_price' => $data['monthly_price'] === null ? null : round((float) $data['monthly_price'], 2),
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
            'latitude' => $center->latitude,
            'longitude' => $center->longitude,
            'status' => $center->status,
            'monthly_price' => $center->monthly_price === null ? null : (float) $center->monthly_price,
        ];
    }
}
