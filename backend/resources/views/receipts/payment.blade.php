<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Receipt {{ $payment->receipt_number }}</title>
    <style>
        body {
            font-family: Helvetica, Arial, sans-serif;
            font-size: 12px;
            color: #14161c;
            margin: 0;
            padding: 0;
        }
        .accent-bar { background-color: #eab03e; height: 8px; width: 100%; font-size: 1px; line-height: 1px; }
        .page { padding: 28px 40px 40px; }

        table { border-collapse: collapse; }
        .full { width: 100%; }

        .header-table td { vertical-align: top; padding: 0; }
        .company-name { font-size: 19px; font-weight: bold; color: #14161c; }
        .company-tagline { font-size: 10px; color: #8a94a3; margin-top: 2px; }
        .receipt-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #8a94a3; text-align: right; }
        .receipt-number { font-size: 13px; font-weight: bold; color: #14161c; text-align: right; margin-top: 2px; }

        .spacer { height: 18px; font-size: 1px; line-height: 1px;}

        .amount-table { width: 100%; background-color: #fdf3de; border: 1px solid #f2ddac; border-radius: 8px; }
        .amount-table td { padding: 14px 18px; }
        .amount-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #8a6d23; }
        .amount-value { font-size: 26px; font-weight: bold; color: #14161c; margin-top: 2px; }
        .amount-status { text-align: right; font-size: 11px; font-weight: bold; color: #1a7a3c; white-space: nowrap; }
        .amount-status .dot {
            display: inline-block;
            width: 6px;
            height: 6px;
            background-color: #22c55e;
            border-radius: 3px;
        }

        .section-title {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #8a94a3;
            padding-bottom: 6px;
        }

        .details-table { width: 100%; }
        .details-table > tbody > tr > td { vertical-align: top; width: 50%; padding: 0; }
        .meta-table { width: 100%; }
        .meta-table td { padding: 2.5px 0; font-size: 11.5px; }
        .meta-table td.label { color: #8a94a3; width: 105px; }
        .meta-table td.value { color: #14161c; }

        .line-table { width: 100%; margin-top: 6px; }
        .line-table thead th {
            text-align: left;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #8a94a3;
            border-bottom: 1px solid #e2e4e8;
            padding: 6px 0;
        }
        .line-table th.amount, .line-table td.amount { text-align: right; }
        .line-table td { padding: 9px 0; border-bottom: 1px solid #eef0f2; font-size: 12px; }
        .line-table tr.total-row td {
            border-bottom: none;
            border-top: 2px solid #14161c;
            font-weight: bold;
            font-size: 14px;
            padding-top: 12px;
        }

        .footer {
            margin-top: 26px;
            padding-top: 14px;
            border-top: 1px solid #e2e4e8;
            font-size: 10px;
            color: #8a94a3;
            text-align: center;
        }
        .footer .thanks { font-size: 11px; color: #14161c; font-weight: bold; margin-bottom: 3px; }
    </style>
</head>
<body>
    <div class="accent-bar">&nbsp;</div>
    <div class="page">
        <table class="full header-table">
            <tr>
                <td style="width: 60%;">
                    <div class="company-name">{{ $tenant->company_name }}</div>
                    <div class="company-tagline">Operator Code: {{ $tenant->operator_code }}</div>
                    <div class="company-tagline">{{ $tenant->contact_phone }} &middot; {{ $tenant->email }}</div>
                </td>
                <td style="width: 40%;">
                    <div class="receipt-label">Receipt</div>
                    <div class="receipt-number">{{ $payment->receipt_number }}</div>
                </td>
            </tr>
        </table>

        <div class="spacer">&nbsp;</div>

        @php
            $methodLabels = [
                'cash' => 'Cash',
                'bank_transfer' => 'Bank transfer',
                'fpx' => 'FPX',
                'online' => 'Online payment (Billplz)',
            ];
            $settled = $balanceAfter <= 0;
        @endphp

        <table class="amount-table">
            <tr>
                <td style="width: 55%;">
                    <div class="amount-label">Amount received</div>
                    <div class="amount-value">RM {{ number_format((float) $payment->amount_paid, 2) }}</div>
                </td>
                <td style="width: 45%;" class="amount-status">
                    <span class="dot">&nbsp;</span>&nbsp; Received on {{ $payment->payment_date?->format('d M Y') }}
                </td>
            </tr>
        </table>

        <div class="spacer">&nbsp;</div>

        <table class="details-table">
            <tr>
                <td>
                    <div class="section-title">Billed to</div>
                    <table class="meta-table">
                        <tr>
                            <td class="label">Parent</td>
                            <td class="value">{{ $parentProfile->full_name }}</td>
                        </tr>
                        <tr>
                            <td class="label">Student</td>
                            <td class="value">{{ $student->full_name }}</td>
                        </tr>
                        <tr>
                            <td class="label">Route</td>
                            <td class="value">{{ $invoice->route?->name ?? '—' }}</td>
                        </tr>
                        <tr>
                            <td class="label">Billing period</td>
                            <td class="value">{{ $invoice->period_start?->format('F Y') }}</td>
                        </tr>
                    </table>
                </td>
                <td>
                    <div class="section-title">Payment</div>
                    <table class="meta-table">
                        <tr>
                            <td class="label">Method</td>
                            <td class="value">{{ $methodLabels[$payment->method] ?? ucwords(str_replace('_', ' ', $payment->method)) }}</td>
                        </tr>
                        <tr>
                            <td class="label">Reference no.</td>
                            <td class="value">{{ $payment->reference_number ?? '—' }}</td>
                        </tr>
                        <tr>
                            <td class="label">Bill no.</td>
                            <td class="value">#{{ $invoice->id }}</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <table class="line-table">
            <thead>
                <tr>
                    <th>Bill</th>
                    <th class="amount">Amount (RM)</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($invoice->items as $item)
                    <tr>
                        <td>{{ $item->description }}@if ($loop->first) — {{ $invoice->period_start?->format('F Y') }}@endif</td>
                        <td class="amount">{{ number_format((float) $item->amount, 2) }}</td>
                    </tr>
                @endforeach
                <tr>
                    <td><strong>Bill total</strong></td>
                    <td class="amount"><strong>{{ number_format((float) $invoice->final_amount, 2) }}</strong></td>
                </tr>
                @if ($paidBefore > 0)
                    <tr>
                        <td>Paid before this payment</td>
                        <td class="amount">-{{ number_format($paidBefore, 2) }}</td>
                    </tr>
                @endif
                <tr>
                    <td>This payment</td>
                    <td class="amount">-{{ number_format((float) $payment->amount_paid, 2) }}</td>
                </tr>
                <tr class="total-row">
                    <td>{{ $settled ? 'Paid in full' : 'Balance remaining' }}</td>
                    <td class="amount">RM {{ number_format($balanceAfter, 2) }}</td>
                </tr>
            </tbody>
        </table>

        <div class="footer">
            <div class="thanks">Thank you for your payment.</div>
            This receipt confirms payment received by {{ $tenant->company_name }} via BasSekolah.my.
        </div>
    </div>
</body>
</html>
