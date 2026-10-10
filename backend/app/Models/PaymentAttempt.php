<?php

namespace App\Models;

use App\Enums\PaymentAttemptStatus;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * One online checkout (a single Billplz bill) covering one or more invoices.
 * Billplz only reports a bill as a whole, so the bill↔invoices mapping lives here.
 */
class PaymentAttempt extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'billplz_bill_id',
        'bill_url',
        'amount',
        'status',
        'paid_at',
    ];

    protected $casts = [
        'status' => PaymentAttemptStatus::class,
        'paid_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function invoices(): BelongsToMany
    {
        return $this->belongsToMany(Invoice::class, 'invoice_payment_attempt')->withPivot('amount');
    }

    /** Billplz works in cents; we store ringgit. */
    public function amountInCents(): int
    {
        return (int) round(((float) $this->amount) * 100);
    }
}
