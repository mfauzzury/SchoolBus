<?php

namespace App\Http\Controllers\Api\Operator;

use App\Enums\InvoiceStatus;
use App\Http\Controllers\Concerns\FiltersInvoices;
use App\Http\Controllers\Controller;
use App\Models\Invoice;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    use FiltersInvoices;

    public function summary(Request $request)
    {
        // Summary cards break the filtered set down by status themselves, so this
        // endpoint expects only route_id/month/date_from/date_to — never 'status'.
        // Cancelled bills are already left out by the shared filter.
        $invoices = $this->filteredInvoices($request)->with('payments')->get();

        $totalExpected = (float) $invoices->sum('final_amount');
        // Money actually received, so a part-paid bill counts for what was paid.
        $totalCollected = (float) $invoices->sum(fn (Invoice $invoice) => $invoice->amountPaid());
        $totalOutstanding = (float) $invoices->sum(fn (Invoice $invoice) => $invoice->balance());
        $overdueCount = $invoices
            ->where('status', InvoiceStatus::Issued)
            ->filter(fn ($invoice) => $invoice->due_date?->isPast())
            ->count();

        return response()->json([
            'total_expected' => round($totalExpected, 2),
            'total_collected' => round($totalCollected, 2),
            'total_outstanding' => round($totalOutstanding, 2),
            'overdue_count' => $overdueCount,
        ]);
    }
}
