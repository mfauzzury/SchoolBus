<?php

namespace App\Http\Controllers\Api\Operator;

use App\Http\Controllers\Controller;
use App\Models\TransitCenter;

/**
 * The transit centers that work with this operator, to look at only. Centers
 * are added and changed by the platform team (Admin\TransitCenterController).
 */
class TransitCenterController extends Controller
{
    public function index()
    {
        return TransitCenter::orderBy('name')
            ->get(['id', 'name', 'contact_person', 'phone', 'address', 'status', 'user_id'])
            ->map(fn (TransitCenter $center) => [
                'id' => $center->id,
                'name' => $center->name,
                'contact_person' => $center->contact_person,
                'phone' => $center->phone,
                'address' => $center->address,
                'status' => $center->status,
                'has_login' => $center->user_id !== null,
            ]);
    }
}
