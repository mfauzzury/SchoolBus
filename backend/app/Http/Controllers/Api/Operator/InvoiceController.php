<?php

namespace App\Http\Controllers\Api\Operator;

use App\Http\Controllers\Concerns\FiltersInvoices;
use App\Http\Controllers\Concerns\GeneratesReceipts;
use App\Http\Controllers\Controller;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;

class InvoiceController extends Controller
{
    use FiltersInvoices, GeneratesReceipts;

    public function index(Request $request)
    {
        return $this->filteredInvoices($request)
            ->with(['student', 'route', 'payments'])
            ->orderByDesc('issued_at')
            ->get();
    }

    public function export(Request $request)
    {
        $invoices = $this->filteredInvoices($request)
            ->with(['student', 'route'])
            ->orderByDesc('issued_at')
            ->get();

        $csv = fopen('php://temp', 'r+');
        fputcsv($csv, ['Invoice ID', 'Student', 'Route', 'Package', 'Billing Period', 'Amount Before Discount', 'Discount', 'Final Amount', 'Status', 'Due Date', 'Issued At']);

        foreach ($invoices as $invoice) {
            fputcsv($csv, [
                $invoice->id,
                $invoice->student->full_name,
                $invoice->route?->name,
                $invoice->package_type->value,
                $invoice->billing_period->value,
                $invoice->amount_before_discount,
                $invoice->discount_amount,
                $invoice->final_amount,
                $invoice->status->value,
                $invoice->due_date?->toDateString(),
                $invoice->issued_at?->toDateTimeString(),
            ]);
        }

        rewind($csv);
        $body = stream_get_contents($csv);
        fclose($csv);

        return Response::make($body, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="invoices.csv"',
        ]);
    }

    public function receipt(Invoice $invoice)
    {
        return $this->receiptResponse($invoice);
    }
}
