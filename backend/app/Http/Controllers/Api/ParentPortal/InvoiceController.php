<?php

namespace App\Http\Controllers\Api\ParentPortal;

use App\Enums\InvoiceStatus;
use App\Http\Controllers\Concerns\GeneratesReceipts;
use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    use GeneratesReceipts;

    public function index(Request $request)
    {
        $studentIds = $request->user()->parentProfile->students()->pluck('id');

        // Cancelled bills were raised by mistake — parents never see them.
        return Invoice::with(['student', 'route:id,name', 'items', 'payments'])
            ->whereIn('student_id', $studentIds)
            ->where('status', '!=', InvoiceStatus::Void)
            ->orderByDesc('created_at')
            ->get()
            ->each->withBalance();
    }

    /** The receipt for one payment made towards one of the parent's own children's bills. */
    public function paymentReceipt(Request $request, Payment $payment)
    {
        $studentIds = $request->user()->parentProfile->students()->pluck('id');

        abort_unless($studentIds->contains($payment->invoice->student_id), 404);

        return $this->receiptResponse($payment);
    }
}
