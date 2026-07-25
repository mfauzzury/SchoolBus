<?php

namespace App\Http\Controllers\Api\ParentPortal;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        return $request->user()->parentProfile
            ->students()
            ->with([
                'route.bus:id,plate_number,capacity,avatar_path',
                'route.driver:id,full_name,phone,avatar_path',
                'route.conductor:id,full_name,phone,avatar_path',
                'route.stops',
                'pickupStop',
                'invoices',
            ])
            ->orderBy('created_at')
            ->get();
    }
}
