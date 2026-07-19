<?php

namespace App\Http\Controllers\Api\ParentPortal;

use App\Http\Controllers\Concerns\GeneratesReceipts;
use App\Http\Controllers\Controller;
use App\Models\Invoice;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    use GeneratesReceipts;

    public function index(Request $request)
    {
        $studentIds = $request->user()->parentProfile->students()->pluck('id');

        return Invoice::with('student')
            ->whereIn('student_id', $studentIds)
            ->orderByDesc('created_at')
            ->get();
    }

    public function receipt(Request $request, Invoice $invoice)
    {
        $studentIds = $request->user()->parentProfile->students()->pluck('id');

        abort_unless($studentIds->contains($invoice->student_id), 404);

        return $this->receiptResponse($invoice);
    }
}
