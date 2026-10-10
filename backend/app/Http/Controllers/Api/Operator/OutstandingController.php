<?php

namespace App\Http\Controllers\Api\Operator;

use App\Enums\InvoiceStatus;
use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Services\InvoiceGenerator;

/**
 * Who owes money: unpaid balances rolled up per parent (a parent pays for all
 * their children at once, so that's who the operator chases), largest first.
 */
class OutstandingController extends Controller
{
    public function index()
    {
        $today = InvoiceGenerator::today();

        return Invoice::query()
            ->where('status', InvoiceStatus::Issued)
            ->with(['payments', 'student.parentProfile:id,full_name,phone,email'])
            ->get()
            ->filter(fn (Invoice $invoice) => $invoice->balance() > 0)
            ->groupBy(fn (Invoice $invoice) => $invoice->student->parent_id)
            ->map(function ($invoices) use ($today) {
                $oldestDue = $invoices->pluck('due_date')->filter()->min();

                return [
                    'parent' => $invoices->first()->student->parentProfile,
                    'students' => $invoices->pluck('student')->unique('id')->map(fn ($student) => ['id' => $student->id, 'full_name' => $student->full_name])->values(),
                    'invoice_count' => $invoices->count(),
                    'total_outstanding' => round($invoices->sum(fn (Invoice $invoice) => $invoice->balance()), 2),
                    'oldest_due_date' => $oldestDue?->toDateString(),
                    'days_overdue' => $oldestDue && $oldestDue->lt($today) ? (int) $oldestDue->diffInDays($today) : 0,
                ];
            })
            ->sortByDesc('total_outstanding')
            ->values();
    }
}
