<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentAttemptStatus;
use App\Http\Controllers\Controller;
use App\Models\Bus;
use App\Models\BusOperator;
use App\Models\Invoice;
use App\Models\ParentProfile;
use App\Models\Payment;
use App\Models\PaymentAttempt;
use App\Models\Student;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function summary()
    {
        $totalExpected = (float) Invoice::sum('final_amount');
        $totalCollected = (float) Invoice::where('status', InvoiceStatus::Paid)->sum('final_amount');

        $thisMonth = Carbon::now()->startOfMonth();

        return response()->json([
            'total_operators' => BusOperator::count(),
            'total_students' => Student::count(),
            'total_buses' => Bus::count(),
            'total_parents' => ParentProfile::count(),
            'total_expected' => $totalExpected,
            'total_collected' => $totalCollected,
            'total_outstanding' => round($totalExpected - $totalCollected, 2),
            // This month so far, next to the whole of last month, so the tiles can say
            // "8 this month, 12 last month" without pretending to be like-for-like.
            'this_month' => $this->monthFigures($thisMonth),
            'last_month' => $this->monthFigures($thisMonth->copy()->subMonth()),
        ]);
    }

    /**
     * The last 12 months (oldest first, current month last). One small
     * date-range query per figure per month rather than database-specific
     * date functions, so it behaves the same on PostgreSQL and the SQLite tests.
     */
    public function trends()
    {
        $start = Carbon::now()->startOfMonth()->subMonths(11);

        $months = [];
        for ($i = 0; $i < 12; $i++) {
            $month = $start->copy()->addMonths($i);
            $months[] = ['month' => $month->format('Y-m'), ...$this->monthFigures($month)];
        }

        return response()->json(['months' => $months]);
    }

    /**
     * Who needs a call. Counts and a few names per reason; the operator list
     * applies the very same definitions through its `attention` filter, so a
     * count here always matches the list it links to.
     */
    public function attention()
    {
        $lists = [];

        foreach (BusOperator::ATTENTION as $kind) {
            $query = BusOperator::query()->attention($kind);

            $lists[$kind] = [
                'count' => (clone $query)->count(),
                'items' => $query->orderBy('company_name')->limit(5)
                    ->toBase()->get(['bus_operators.id', 'bus_operators.company_name']),
            ];
        }

        // A parent started an online payment and never finished it — often a failed checkout.
        $stuck = PaymentAttempt::query()
            ->where('status', PaymentAttemptStatus::Pending)
            ->where('created_at', '<=', now()->subHour());

        $lists['stuck_payments'] = [
            'count' => (clone $stuck)->count(),
            'items' => $stuck->with('busOperator:id,company_name')->latest()->limit(5)->get()
                ->map(fn (PaymentAttempt $attempt) => [
                    'id' => $attempt->id,
                    'amount' => $attempt->amount,
                    'created_at' => $attempt->created_at,
                    'operator_id' => $attempt->tenant_id,
                    'company_name' => $attempt->busOperator?->company_name,
                ])->values(),
        ];

        return response()->json($lists);
    }

    /** @return array{new_operators: int, new_students: int, collected: float} */
    private function monthFigures(Carbon $monthStart): array
    {
        $from = $monthStart->copy()->startOfMonth();
        $to = $from->copy()->addMonth();

        return [
            'new_operators' => BusOperator::where('created_at', '>=', $from)->where('created_at', '<', $to)->count(),
            'new_students' => Student::where('created_at', '>=', $from)->where('created_at', '<', $to)->count(),
            // Money actually received (payments by payment date) — the same basis as the Transactions page.
            'collected' => (float) Payment::where('payment_date', '>=', $from->toDateString())
                ->where('payment_date', '<', $to->toDateString())
                ->sum('amount_paid'),
        ];
    }
}
