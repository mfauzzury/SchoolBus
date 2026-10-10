<?php

namespace App\Http\Controllers\Api\ParentPortal;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentAttemptStatus;
use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentAttempt;
use App\Services\BillplzService;
use App\Services\PaymentAttemptSettler;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class PaymentController extends Controller
{
    /**
     * Lets the pay screen know whether this operator has online payments set up
     * before offering the button.
     */
    public function config(Request $request)
    {
        return ['enabled' => $request->user()->busOperator->hasBillplz()];
    }

    /**
     * Start a checkout: price the chosen invoices server-side (the client never
     * supplies an amount), open a Billplz bill and hand back its payment page.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $operator = $user->busOperator;

        abort_unless($operator->hasBillplz(), 422, 'Online payments are not available for this operator.');

        $data = $request->validate([
            'invoice_ids' => 'required|array|min:1',
            'invoice_ids.*' => 'integer|distinct',
        ]);

        $studentIds = $user->parentProfile->students()->pluck('id');

        $invoices = Invoice::with('payments')
            ->whereIn('id', $data['invoice_ids'])
            ->whereIn('student_id', $studentIds)
            ->whereIn('status', [InvoiceStatus::Issued, InvoiceStatus::Overdue])
            ->get();

        abort_unless(
            $invoices->count() === count($data['invoice_ids']),
            422,
            'One or more invoices cannot be paid online.',
        );

        // Charge each invoice's outstanding balance, not its face value, so a
        // part-paid invoice (operator recorded a cash deposit) isn't over-collected.
        $lines = $invoices->mapWithKeys(fn (Invoice $invoice) => [
            $invoice->id => round((float) $invoice->final_amount - (float) $invoice->payments->sum('amount_paid'), 2),
        ])->filter(fn (float $outstanding) => $outstanding > 0);

        abort_if($lines->isEmpty(), 422, 'Nothing is outstanding on the selected invoices.');

        $attempt = DB::transaction(function () use ($user, $lines) {
            $attempt = PaymentAttempt::create([
                'tenant_id' => $user->tenant_id,
                'user_id' => $user->id,
                'amount' => $lines->sum(),
            ]);

            $attempt->invoices()->attach(
                $lines->map(fn (float $amount) => ['amount' => $amount])->all(),
            );

            return $attempt;
        });

        try {
            $bill = (new BillplzService($operator))->createBill(
                amountInCents: $attempt->amountInCents(),
                name: $user->parentProfile->full_name,
                email: $user->email,
                description: "School bus fees - {$operator->company_name}",
                callbackUrl: $this->callbackUrl(),
                redirectUrl: rtrim(config('services.billplz.frontend_url'), '/')."/parent/invoices/pay/return/{$attempt->id}",
                reference: (string) $attempt->id,
            );
        } catch (Throwable $e) {
            Log::error('Billplz bill creation failed', ['attempt' => $attempt->id, 'error' => $e->getMessage()]);
            $attempt->delete();

            return response()->json(['message' => 'The payment provider is unavailable. Please try again shortly.'], 502);
        }

        $attempt->update(['billplz_bill_id' => $bill['id'], 'bill_url' => $bill['url']]);

        return response()->json(['id' => $attempt->id, 'url' => $bill['url']], 201);
    }

    public function show(Request $request, PaymentAttempt $attempt)
    {
        $this->authorizeAttempt($request, $attempt);

        return $this->payload($attempt);
    }

    /**
     * Instant confirmation from the browser redirect. The redirect is signed with
     * the operator's X Signature key, so a valid one is as trustworthy as the
     * server callback — and it works in local dev where Billplz can't reach us.
     * Settling is idempotent, so racing the callback is harmless.
     */
    public function confirm(Request $request, PaymentAttempt $attempt, PaymentAttemptSettler $settler)
    {
        $this->authorizeAttempt($request, $attempt);

        $billplz = $request->validate([
            'billplz' => 'required|array',
            'billplz.id' => 'required|string',
            'billplz.paid' => 'required|string',
            'billplz.paid_at' => 'nullable|string',
            'billplz.x_signature' => 'required|string',
        ])['billplz'];

        $signature = $billplz['x_signature'];
        unset($billplz['x_signature']);

        $key = $request->user()->busOperator->billplz_x_signature_key;

        abort_unless(
            filled($key) && BillplzService::verify(BillplzService::prefixRedirectParams($billplz), $signature, $key),
            403,
            'Invalid payment signature.',
        );

        abort_unless($billplz['id'] === $attempt->billplz_bill_id, 403, 'Payment does not match this checkout.');

        if ($billplz['paid'] === 'true') {
            $paidAt = filled($billplz['paid_at'] ?? null) ? Carbon::parse($billplz['paid_at']) : null;
            $settler->settle($attempt, $paidAt);
        }

        return $this->payload($attempt->fresh());
    }

    private function authorizeAttempt(Request $request, PaymentAttempt $attempt): void
    {
        abort_unless($attempt->user_id === $request->user()->id, 404);
    }

    private function payload(PaymentAttempt $attempt): array
    {
        return [
            'id' => $attempt->id,
            'status' => $attempt->status->value,
            'amount' => $attempt->amount,
            'paid_at' => $attempt->paid_at,
            // Lets the return page offer "try again" for an unpaid, still-open bill.
            'bill_url' => $attempt->status === PaymentAttemptStatus::Pending ? $attempt->bill_url : null,
            // One receipt per invoice paid, so the success page can offer them straight away.
            'receipts' => $this->receipts($attempt),
        ];
    }

    private function receipts(PaymentAttempt $attempt): array
    {
        if ($attempt->status !== PaymentAttemptStatus::Paid) {
            return [];
        }

        // Settling stamps every payment with the Billplz bill id as its reference.
        return Payment::with('invoice.student:id,full_name')
            ->whereIn('invoice_id', $attempt->invoices()->pluck('invoices.id'))
            ->where('reference_number', $attempt->billplz_bill_id)
            ->orderBy('id')
            ->get()
            ->map(fn (Payment $payment) => [
                'payment_id' => $payment->id,
                'receipt_number' => $payment->receipt_number,
                'amount' => $payment->amount_paid,
                'student_name' => $payment->invoice->student->full_name,
            ])
            ->all();
    }

    private function callbackUrl(): string
    {
        $base = config('services.billplz.callback_base_url') ?: config('app.url');

        return rtrim($base, '/').'/api/webhooks/billplz';
    }
}
