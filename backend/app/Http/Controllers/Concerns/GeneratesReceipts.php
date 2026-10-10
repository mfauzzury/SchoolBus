<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Payment;
use App\Services\ReceiptBuilder;
use Barryvdh\DomPDF\Facade\Pdf;
use Symfony\Component\HttpFoundation\Response;

/**
 * Shared PDF receipt generation, used by both the operator ledger and the
 * parent portal (each with their own authorization check before calling in).
 * A receipt is issued per payment, so a part-payment is acknowledged as soon
 * as it is made rather than only when the bill is settled.
 */
trait GeneratesReceipts
{
    private function receiptResponse(Payment $payment): Response
    {
        $data = app(ReceiptBuilder::class)->viewData($payment);

        return Pdf::loadView('receipts.payment', $data)->download("receipt-{$payment->receipt_number}.pdf");
    }
}
