<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Receipt #{{ $invoice->id }}</title>
    <style>
        body { font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #111; margin: 0; padding: 40px; }
        .header { overflow: hidden; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #111; }
        .header .company { float: left; font-size: 18px; font-weight: bold; }
        .header .receipt-label { float: right; text-align: right; }
        .receipt-label .badge { display: inline-block; padding: 4px 10px; border: 1px solid #111; font-size: 11px; font-weight: bold; letter-spacing: 1px; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; }
        .meta-table td { padding: 2px 0; vertical-align: top; }
        .meta-table td.label { color: #666; width: 140px; }
        .line-table { margin-top: 8px; }
        .line-table th, .line-table td { text-align: left; padding: 8px 0; border-bottom: 1px solid #ddd; }
        .line-table th { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #666; }
        .line-table .amount { text-align: right; }
        .total-row td { border-bottom: none; border-top: 2px solid #111; font-weight: bold; font-size: 14px; padding-top: 12px; }
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 10px; color: #666; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company">{{ $tenant->company_name }}</div>
        <div class="receipt-label">
            <div class="badge">PAID</div>
            <div style="margin-top: 6px;">Receipt #{{ $invoice->id }}</div>
        </div>
    </div>

    <div class="section">
        <table class="meta-table">
            <tr>
                <td class="label">Billed to</td>
                <td>{{ $parentProfile->full_name }}</td>
                <td class="label">Payment date</td>
                <td>{{ optional($payment?->payment_date)->format('d M Y') ?? '—' }}</td>
            </tr>
            <tr>
                <td class="label">Student</td>
                <td>{{ $student->full_name }}</td>
                <td class="label">Payment method</td>
                <td>{{ $payment ? ucwords(str_replace('_', ' ', $payment->method)) : '—' }}</td>
            </tr>
            <tr>
                <td class="label">Route</td>
                <td>{{ $invoice->route?->name ?? '—' }}</td>
                <td class="label">Reference no.</td>
                <td>{{ $payment?->reference_number ?? '—' }}</td>
            </tr>
            <tr>
                <td class="label">Billing period</td>
                <td>{{ $invoice->period_start?->format('F Y') }}</td>
                <td class="label"></td>
                <td></td>
            </tr>
        </table>
    </div>

    <div class="section">
        <table class="line-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="amount">Amount (RM)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Bus fee — {{ $invoice->period_start?->format('F Y') }}</td>
                    <td class="amount">{{ number_format((float) $invoice->amount_before_discount, 2) }}</td>
                </tr>
                @if ((float) $invoice->discount_amount > 0)
                    <tr>
                        <td>Discount</td>
                        <td class="amount">-{{ number_format((float) $invoice->discount_amount, 2) }}</td>
                    </tr>
                @endif
                <tr class="total-row">
                    <td>Total paid</td>
                    <td class="amount">RM {{ number_format((float) $invoice->final_amount, 2) }}</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="footer">
        This receipt confirms payment received by {{ $tenant->company_name }} via BasSekolah.my.
    </div>
</body>
</html>
