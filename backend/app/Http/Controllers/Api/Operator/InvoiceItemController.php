<?php

namespace App\Http\Controllers\Api\Operator;

use App\Enums\InvoiceItemType;
use App\Http\Controllers\Concerns\EditsInvoices;
use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * One-off adjustments to an unpaid bill: a discount, a waiver, an extra charge.
 * The fee and sibling-discount lines the system generated can't be touched here
 * — to change those, change the student's monthly fee (applies from the next bill).
 */
class InvoiceItemController extends Controller
{
    use EditsInvoices;

    public function store(Request $request, Invoice $invoice)
    {
        $data = $request->validate([
            'description' => 'required|string|max:255',
            // Signed: negative reduces the bill, positive adds a charge.
            'amount' => 'required|numeric|not_in:0|between:-99999.99,99999.99',
        ]);

        DB::transaction(function () use ($request, $invoice, $data) {
            $this->ensureEditable($invoice);

            $invoice->items()->create([
                'tenant_id' => $invoice->tenant_id,
                'type' => InvoiceItemType::Adjustment,
                'description' => $data['description'],
                'amount' => $data['amount'],
                'created_by' => $request->user()->id,
            ]);

            $this->ensureTotalCoversPayments($invoice);
            $invoice->recalculateTotals();
        });

        return response()->json($this->invoicePayload($invoice), 201);
    }

    public function destroy(Invoice $invoice, InvoiceItem $item)
    {
        abort_unless($item->invoice_id === $invoice->id, 404);
        abort_unless($item->type === InvoiceItemType::Adjustment, 422, 'Only adjustment lines can be removed.');

        DB::transaction(function () use ($invoice, $item) {
            $this->ensureEditable($invoice);

            $item->delete();

            $this->ensureTotalCoversPayments($invoice);
            $invoice->recalculateTotals();
        });

        return $this->invoicePayload($invoice);
    }
}
