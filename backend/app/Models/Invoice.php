<?php

namespace App\Models;

use App\Enums\BillingPeriod;
use App\Enums\InvoiceStatus;
use App\Enums\PackageType;
use App\Enums\PaymentAttemptStatus;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'student_id',
        'route_id',
        'package_type',
        'billing_period',
        'period_start',
        'period_end',
        'amount_before_discount',
        'discount_amount',
        'final_amount',
        'status',
        'due_date',
        'issued_at',
        'paid_at',
        'voided_at',
        'void_reason',
    ];

    protected $casts = [
        'status' => InvoiceStatus::class,
        'package_type' => PackageType::class,
        'billing_period' => BillingPeriod::class,
        'period_start' => 'date',
        'period_end' => 'date',
        'due_date' => 'date',
        'issued_at' => 'datetime',
        'paid_at' => 'datetime',
        'voided_at' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function route(): BelongsTo
    {
        return $this->belongsTo(Route::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class)->orderBy('id');
    }

    public function paymentAttempts(): BelongsToMany
    {
        return $this->belongsToMany(PaymentAttempt::class, 'invoice_payment_attempt');
    }

    /**
     * True while an online checkout covering this bill was opened recently and
     * hasn't completed. Abandoned checkouts stay pending forever, hence the window.
     */
    public function isBeingPaidOnline(): bool
    {
        return $this->paymentAttempts()
            ->withoutGlobalScopes()
            ->where('payment_attempts.status', PaymentAttemptStatus::Pending)
            ->where('payment_attempts.created_at', '>=', now()->subMinutes(30))
            ->exists();
    }

    public function amountPaid(): float
    {
        $paid = $this->relationLoaded('payments')
            ? $this->payments->sum('amount_paid')
            : $this->payments()->sum('amount_paid');

        return round((float) $paid, 2);
    }

    /** What is still owed. Never negative, and nothing is owed on a void bill. */
    public function balance(): float
    {
        if ($this->status === InvoiceStatus::Void) {
            return 0.0;
        }

        return max(0.0, round((float) $this->final_amount - $this->amountPaid(), 2));
    }

    /**
     * Not in $appends: both read the payments relation, which would be an extra
     * query per invoice everywhere an invoice is nested in another response.
     * Endpoints that show money owed opt in through withBalance().
     */
    public function getAmountPaidAttribute(): string
    {
        return number_format($this->amountPaid(), 2, '.', '');
    }

    public function getBalanceAttribute(): string
    {
        return number_format($this->balance(), 2, '.', '');
    }

    public function withBalance(): static
    {
        return $this->loadMissing('payments')->append(['amount_paid', 'balance']);
    }

    /**
     * Rebuild the stored totals from the items, after any item is added or
     * removed. A bill whose total is already covered by payments becomes paid
     * (including one adjusted down to zero, i.e. waived).
     */
    public function recalculateTotals(): void
    {
        $amounts = $this->items()->pluck('amount')->map(fn ($amount) => (float) $amount);

        $charges = round($amounts->filter(fn (float $amount) => $amount > 0)->sum(), 2);
        $reductions = round(abs($amounts->filter(fn (float $amount) => $amount < 0)->sum()), 2);

        $this->amount_before_discount = $charges;
        $this->discount_amount = $reductions;
        $this->final_amount = max(0, round($charges - $reductions, 2));

        if ($this->status === InvoiceStatus::Issued && $this->payments()->sum('amount_paid') >= $this->final_amount) {
            $this->status = InvoiceStatus::Paid;
            $this->paid_at = now();
        }

        $this->save();
    }

    /**
     * Record a payment and flip the invoice to paid once the total received
     * covers it. Callers wrap this in a transaction. tenant_id is set explicitly
     * because the Billplz webhook runs with no tenant context.
     */
    public function recordPayment(array $attributes): Payment
    {
        $payment = $this->payments()->create([...$attributes, 'tenant_id' => $this->tenant_id]);

        if ($this->payments()->sum('amount_paid') >= $this->final_amount) {
            $this->update(['status' => InvoiceStatus::Paid, 'paid_at' => now()]);
        }

        return $payment;
    }
}
