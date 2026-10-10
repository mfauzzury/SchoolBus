<?php

namespace App\Http\Controllers\Api\ParentPortal;

use App\Http\Controllers\Controller;
use App\Models\Route;

class RouteController extends Controller
{
    public function index()
    {
        return Route::with('stops')
            ->orderBy('name')
            ->get(['id', 'name', 'zone', 'school_destination', 'base_monthly_fee', 'one_way_monthly_fee']);
    }
}
