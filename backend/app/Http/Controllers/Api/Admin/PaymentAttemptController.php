<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\PaymentAttemptStatus;
use App\Http\Controllers\Controller;
use App\Models\PaymentAttempt;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Online (Billplz) checkouts across every operator — including the ones that
 * were started and never paid, which the Transactions list can't show.
 */
class PaymentAttemptController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'operator_id' => 'nullable|integer',
            'status' => ['nullable', Rule::in(array_column(PaymentAttemptStatus::cases(), 'value'))],
            'stuck' => 'nullable|boolean',
        ]);

        $query = PaymentAttempt::query()
            ->with(['busOperator:id,company_name,operator_code', 'user:id,name'])
            ->withCount('invoices')
            ->latest()
            ->orderByDesc('id');

        if ($request->filled('operator_id')) {
            $query->where('tenant_id', $request->integer('operator_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        // Pending for over an hour: a parent who never finished (or a failed checkout).
        if ($request->boolean('stuck')) {
            $query->where('status', PaymentAttemptStatus::Pending)
                ->where('created_at', '<=', now()->subHour());
        }

        $page = $query->paginate(25);
        $page->getCollection()->transform(function (PaymentAttempt $attempt) {
            $attempt->setAttribute(
                'stuck',
                $attempt->status === PaymentAttemptStatus::Pending && $attempt->created_at <= now()->subHour(),
            );

            return $attempt;
        });

        return $page;
    }
}
