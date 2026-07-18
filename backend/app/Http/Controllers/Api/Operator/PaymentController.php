<?php

namespace App\Http\Controllers\Api\Operator;

use App\Enums\InvoiceStatus;
use App\Http\Controllers\Controller;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PaymentController extends Controller
{
    public function store(Request $request, Invoice $invoice)
    {
        $data = $request->validate([
            'method' => ['required', Rule::in(['cash', 'bank_transfer', 'fpx', 'online'])],
            'reference_number' => 'nullable|string|max:255',
            'payment_date' => 'required|date',
            'amount_paid' => 'required|numeric|min:0.01',
        ]);

        DB::transaction(function () use ($invoice, $data) {
            $invoice->payments()->create($data);

            $totalPaid = $invoice->payments()->sum('amount_paid');

            if ($totalPaid >= $invoice->final_amount) {
                $invoice->update(['status' => InvoiceStatus::Paid, 'paid_at' => now()]);
            }
        });

        return response()->json($invoice->fresh(['payments', 'student', 'route']), 201);
    }
}
