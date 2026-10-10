<?php

namespace App\Http\Controllers\Api\Operator;

use App\Enums\InvoiceStatus;
use App\Http\Controllers\Controller;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

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

        abort_if($invoice->status === InvoiceStatus::Void, 422, 'This bill was cancelled, so it cannot take a payment.');

        // More than is owed would print a receipt that disagrees with the bill and
        // inflate "collected"; paying a settled bill is the same mistake with a balance of 0.
        $owed = $invoice->balance();

        if (round((float) $data['amount_paid'], 2) > $owed) {
            throw ValidationException::withMessages([
                'amount_paid' => $owed > 0
                    ? 'This is more than the RM '.number_format($owed, 2).' still owed on this bill.'
                    : 'Nothing is owed on this bill.',
            ]);
        }

        DB::transaction(function () use ($invoice, $data) {
            $invoice->recordPayment($data);
        });

        return response()->json($invoice->fresh(['payments', 'student', 'route', 'items'])->withBalance(), 201);
    }
}
