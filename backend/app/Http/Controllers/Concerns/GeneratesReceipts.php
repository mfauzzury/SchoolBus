<?php

namespace App\Http\Controllers\Concerns;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use Barryvdh\DomPDF\Facade\Pdf;
use Symfony\Component\HttpFoundation\Response;

/**
 * Shared PDF receipt generation, used by both the operator ledger and the
 * parent portal (each with their own authorization check before calling in).
 */
trait GeneratesReceipts
{
    private function receiptResponse(Invoice $invoice): Response
    {
        abort_unless($invoice->status === InvoiceStatus::Paid, 404, 'Receipts are only available for paid invoices.');

        $invoice->loadMissing(['student.parentProfile', 'route', 'payments', 'busOperator']);

        $pdf = Pdf::loadView('receipts.invoice', [
            'invoice' => $invoice,
            'tenant' => $invoice->busOperator,
            'student' => $invoice->student,
            'parentProfile' => $invoice->student->parentProfile,
            'payment' => $invoice->payments->last(),
        ]);

        return $pdf->download("receipt-invoice-{$invoice->id}.pdf");
    }
}
