<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransitCenter extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'name',
        'contact_person',
        'phone',
        'email',
        'address',
        'monthly_price',
        'status',
    ];

    protected $casts = [
        'monthly_price' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function busOperator(): BelongsTo
    {
        return $this->belongsTo(BusOperator::class, 'tenant_id');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
