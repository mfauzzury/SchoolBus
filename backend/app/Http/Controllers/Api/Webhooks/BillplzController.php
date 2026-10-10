<?php

namespace App\Http\Controllers\Api\Webhooks;

use App\Http\Controllers\Controller;
use App\Models\PaymentAttempt;
use App\Services\BillplzService;
use App\Services\PaymentAttemptSettler;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class BillplzController extends Controller
{
    /**
     * Server-to-server "payment completed" callback. Unauthenticated by session
     * — authenticity comes solely from the X Signature, checked against the key
     * of the operator that owns the bill (hence looked up by bill id first).
     *
     * Billplz retries until it sees a 200, so anything we have fully handled
     * (including "not paid" and already-settled) returns 200.
     */
    public function callback(Request $request, PaymentAttemptSettler $settler)
    {
        $params = $this->rawParams($request);
        $signature = $params['x_signature'] ?? null;
        unset($params['x_signature']);

        $attempt = PaymentAttempt::withoutGlobalScopes()
            ->where('billplz_bill_id', (string) ($params['id'] ?? ''))
            ->first();

        abort_unless($attempt, 404);

        $key = $attempt->busOperator?->billplz_x_signature_key;

        abort_unless(
            filled($key) && BillplzService::verify($params, $signature, $key),
            403,
            'Invalid signature.',
        );

        // A failed attempt leaves the bill "due"; the customer can retry on the same bill.
        if (($params['paid'] ?? null) !== 'true' || ($params['state'] ?? null) !== 'paid') {
            return response()->json(['status' => 'ignored']);
        }

        // Signed, so this is Billplz speaking — but never book money against an
        // attempt whose recorded amount disagrees with what was actually paid.
        if ((int) ($params['paid_amount'] ?? 0) !== $attempt->amountInCents()) {
            Log::error('Billplz paid_amount does not match payment attempt', [
                'attempt' => $attempt->id,
                'expected' => $attempt->amountInCents(),
                'paid_amount' => $params['paid_amount'] ?? null,
            ]);

            return response()->json(['status' => 'amount_mismatch']);
        }

        $paidAt = filled($params['paid_at'] ?? null) ? Carbon::parse($params['paid_at']) : null;

        $settler->settle($attempt, $paidAt);

        return response()->json(['status' => 'ok']);
    }

    /**
     * The signature is computed over the exact values Billplz posted, but Laravel's
     * TrimStrings / ConvertEmptyStringsToNull middleware rewrite parsed input
     * (e.g. a trailing space in `name`, or an empty `mobile`), which would break
     * the HMAC. So read the untouched body, falling back to parsed input.
     *
     * @return array<string, mixed>
     */
    private function rawParams(Request $request): array
    {
        $body = $request->getContent();

        if ($body === '') {
            return $request->post();
        }

        if ($request->isJson()) {
            return json_decode($body, true) ?: [];
        }

        parse_str($body, $parsed);

        return $parsed;
    }
}
