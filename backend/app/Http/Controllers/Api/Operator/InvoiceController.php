<?php

namespace App\Http\Controllers\Api\Operator;

use App\Enums\InvoiceStatus;
use App\Http\Controllers\Concerns\EditsInvoices;
use App\Http\Controllers\Concerns\FiltersInvoices;
use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Student;
use App\Services\InvoiceGenerator;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Response;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class InvoiceController extends Controller
{
    use EditsInvoices, FiltersInvoices;

    public function index(Request $request)
    {
        return $this->filteredInvoices($request)
            ->with(['student', 'route', 'payments', 'items'])
            ->orderByDesc('issued_at')
            ->get()
            ->each->withBalance();
    }

    /** One bill with its lines and payments — the bill page loads this directly. */
    public function show(Invoice $invoice)
    {
        return $invoice->load(['student.parentProfile:id,full_name,phone', 'route:id,name', 'payments', 'items'])->withBalance();
    }

    /**
     * Bill a student for a month by hand — to re-issue a cancelled bill, or to
     * bill a month the schedule skipped. The daily job covers the normal case.
     */
    public function store(Request $request, InvoiceGenerator $generator)
    {
        $data = $request->validate([
            'student_id' => ['required', Rule::exists('students', 'id')->where('tenant_id', $request->user()->tenant_id)],
            'year' => 'required|integer|min:2020|max:2100',
            'month' => 'required|integer|min:1|max:12',
        ]);

        $student = Student::findOrFail($data['student_id']);
        $month = Carbon::create($data['year'], $data['month'], 1);

        if ($generator->invoiceForMonth($student, $month)) {
            throw ValidationException::withMessages([
                'month' => 'This student already has a bill for that month.',
            ]);
        }

        try {
            $invoice = $generator->generateForMonth($student, $month);
        } catch (RuntimeException) {
            throw ValidationException::withMessages([
                'student_id' => 'This student has no route or monthly fee set yet.',
            ]);
        }

        return response()->json($this->invoicePayload($invoice), 201);
    }

    /**
     * Cancel a bill raised by mistake. Kept (not deleted) so the ledger still
     * shows it happened; a bill with money against it can't be cancelled.
     */
    public function void(Request $request, Invoice $invoice)
    {
        $data = $request->validate([
            'reason' => 'required|string|max:255',
        ]);

        $this->ensureEditable($invoice);

        abort_if($invoice->payments()->exists(), 422, 'This bill has payments recorded, so it cannot be cancelled.');

        $invoice->update([
            'status' => InvoiceStatus::Void,
            'voided_at' => now(),
            'void_reason' => $data['reason'],
        ]);

        return $this->invoicePayload($invoice);
    }

    public function export(Request $request)
    {
        $invoices = $this->filteredInvoices($request)
            ->with(['student', 'route', 'payments'])
            ->orderByDesc('issued_at')
            ->get();

        $csv = fopen('php://temp', 'r+');
        fputcsv($csv, ['Invoice ID', 'Student', 'Route', 'Package', 'Period', 'Amount Before Discount', 'Discount', 'Final Amount', 'Paid', 'Balance', 'Status', 'Due Date', 'Issued At']);

        foreach ($invoices as $invoice) {
            fputcsv($csv, [
                $invoice->id,
                $invoice->student->full_name,
                $invoice->route?->name,
                $invoice->package_type->value,
                $invoice->period_start?->format('Y-m'),
                $invoice->amount_before_discount,
                $invoice->discount_amount,
                $invoice->final_amount,
                $invoice->amount_paid,
                $invoice->balance,
                $invoice->status->value,
                $invoice->due_date?->toDateString(),
                $invoice->issued_at?->toDateTimeString(),
            ]);
        }

        rewind($csv);
        $body = stream_get_contents($csv);
        fclose($csv);

        return Response::make($body, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="invoices.csv"',
        ]);
    }
}
