<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'invoice_id',
        'method',
        'reference_number',
        'payment_date',
        'amount_paid',
        'receipt_path',
    ];

    protected $casts = [
        'payment_date' => 'date',
    ];

    protected $appends = ['receipt_number'];

    /**
     * Every payment is its own receipt, so the payment's id is the receipt's
     * number — unique, and stable for as long as the payment exists.
     */
    public function getReceiptNumberAttribute(): string
    {
        return 'R-'.str_pad((string) $this->id, 6, '0', STR_PAD_LEFT);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
