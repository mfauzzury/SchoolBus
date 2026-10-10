<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\InvoiceStatus;
use App\Http\Controllers\Controller;
use App\Models\BusOperator;

class OperatorController extends Controller
{
    public function index()
    {
        return BusOperator::withCount(['students', 'buses', 'staff', 'routes', 'parents'])
            ->orderBy('company_name')
            ->get();
    }

    /**
     * Mirrors what the operator sees across their own portal (students, fleet,
     * staff, routes, finances) so the platform admin can inspect one tenant in
     * full without impersonating them.
     */
    public function show(BusOperator $operator)
    {
        $operator->loadCount(['students', 'buses', 'staff', 'routes', 'parents']);
        $operator->load([
            'buses' => fn ($query) => $query->orderBy('plate_number'),
            'staff' => fn ($query) => $query->orderBy('full_name'),
            'routes' => fn ($query) => $query
                ->with(['bus:id,plate_number', 'driver:id,full_name', 'conductor:id,full_name'])
                ->withCount('stops')
                ->orderBy('name'),
            'students' => fn ($query) => $query
                ->with(['parentProfile:id,full_name,phone,email', 'route:id,name'])
                ->orderBy('full_name'),
        ]);

        $totalExpected = (float) $operator->invoices()->sum('final_amount');
        $totalCollected = (float) $operator->invoices()->where('status', InvoiceStatus::Paid)->sum('final_amount');
        $overdueCount = $operator->invoices()
            ->where('status', InvoiceStatus::Issued)
            ->whereDate('due_date', '<', now())
            ->count();

        return [
            ...$operator->toArray(),
            'billplz' => $operator->billplzSummary(),
            'finance_summary' => [
                'total_expected' => $totalExpected,
                'total_collected' => $totalCollected,
                'total_outstanding' => round($totalExpected - $totalCollected, 2),
                'overdue_count' => $overdueCount,
            ],
        ];
    }
}
