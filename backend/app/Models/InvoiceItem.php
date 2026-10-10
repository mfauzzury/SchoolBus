<?php

namespace App\Models;

use App\Enums\InvoiceItemType;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One line of a bill. Amounts are signed (discounts and reductions negative)
 * and an invoice's totals are always derived from its items.
 */
class InvoiceItem extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'invoice_id',
        'type',
        'description',
        'amount',
        'created_by',
    ];

    protected $casts = [
        'type' => InvoiceItemType::class,
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
