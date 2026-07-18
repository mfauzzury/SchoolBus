<?php

namespace App\Http\Controllers\Api\Operator;

use App\Enums\InvoiceStatus;
use App\Http\Controllers\Concerns\FiltersInvoices;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    use FiltersInvoices;

    public function summary(Request $request)
    {
        // Summary cards break the filtered set down by status themselves, so this
        // endpoint expects only route_id/month/date_from/date_to — never 'status'.
        $invoices = $this->filteredInvoices($request)->get();

        $totalExpected = (float) $invoices->sum('final_amount');
        $totalCollected = (float) $invoices->where('status', InvoiceStatus::Paid)->sum('final_amount');
        $overdueCount = $invoices
            ->where('status', InvoiceStatus::Issued)
            ->filter(fn ($invoice) => $invoice->due_date?->isPast())
            ->count();

        return response()->json([
            'total_expected' => $totalExpected,
            'total_collected' => $totalCollected,
            'total_outstanding' => round($totalExpected - $totalCollected, 2),
            'overdue_count' => $overdueCount,
        ]);
    }
}
