<?php

namespace App\Http\Controllers\Concerns;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use Illuminate\Validation\ValidationException;

/**
 * The rules every change to an issued bill has to pass (adjusting, cancelling),
 * and the one response shape the ledger gets back afterwards.
 */
trait EditsInvoices
{
    /**
     * Paid and cancelled bills are locked. So is a bill a parent is paying online
     * right now: their checkout was opened for a fixed amount, and changing the
     * bill underneath it would leave them over- or under-charged.
     */
    private function ensureEditable(Invoice $invoice): void
    {
        abort_unless($invoice->status === InvoiceStatus::Issued, 422, 'Only unpaid bills can be changed.');

        abort_if(
            $invoice->isBeingPaidOnline(),
            409,
            'The parent is paying this bill online right now. Please try again in a few minutes.',
        );
    }

    private function ensureTotalCoversPayments(Invoice $invoice): void
    {
        $total = round((float) $invoice->items()->sum('amount'), 2);
        $paid = $invoice->amountPaid();

        if ($total < $paid) {
            throw ValidationException::withMessages([
                'amount' => $paid > 0
                    ? 'The bill cannot go below the RM '.number_format($paid, 2).' already paid.'
                    : 'The bill cannot go below zero.',
            ]);
        }
    }

    private function invoicePayload(Invoice $invoice): Invoice
    {
        return $invoice->fresh(['student', 'route', 'payments', 'items'])->withBalance();
    }
}
