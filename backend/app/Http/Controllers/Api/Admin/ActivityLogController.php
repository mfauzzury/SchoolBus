<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $query = ActivityLog::query()
            ->with(['user:id,name', 'busOperator:id,company_name'])
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->integer('user_id'));
        }

        if ($request->filled('tenant_id')) {
            $query->where('tenant_id', $request->integer('tenant_id'));
        }

        if ($request->filled('action')) {
            $query->where('action', $request->input('action'));
        }

        return $query->paginate(25);
    }

    /** The distinct things that have been logged, for the filter dropdown. */
    public function actions()
    {
        return ActivityLog::query()->distinct()->orderBy('action')->pluck('action');
    }
}
