<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\InvoiceStatus;
use App\Http\Controllers\Controller;
use App\Models\Bus;
use App\Models\BusOperator;
use App\Models\Invoice;
use App\Models\ParentProfile;
use App\Models\Student;

class DashboardController extends Controller
{
    public function summary()
    {
        $totalExpected = (float) Invoice::sum('final_amount');
        $totalCollected = (float) Invoice::where('status', InvoiceStatus::Paid)->sum('final_amount');

        return response()->json([
            'total_operators' => BusOperator::count(),
            'total_students' => Student::count(),
            'total_buses' => Bus::count(),
            'total_parents' => ParentProfile::count(),
            'total_expected' => $totalExpected,
            'total_collected' => $totalCollected,
            'total_outstanding' => round($totalExpected - $totalCollected, 2),
        ]);
    }
}
