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
        'latitude',
        'longitude',
        'monthly_price',
        'status',
    ];

    protected $casts = [
        'monthly_price' => 'decimal:2',
        // The pin on the map (both set, or neither): a plain number in the API, not a string.
        'latitude' => 'float',
        'longitude' => 'float',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
