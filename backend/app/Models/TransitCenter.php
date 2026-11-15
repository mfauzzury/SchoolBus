<?php

namespace App\Models;

use App\Enums\TransitLeg;
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
        'leg_prices',
        'status',
    ];

    protected $casts = [
        'leg_prices' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function busOperator(): BelongsTo
    {
        return $this->belongsTo(BusOperator::class, 'tenant_id');
    }

    /**
     * The monthly add-on for each part of the day, as this center sees it as
     * an estimate. Null = the operator hasn't set that price yet.
     *
     * @return array<string, ?float>
     */
    public function resolvedLegPrices(): array
    {
        $saved = $this->leg_prices ?? [];
        $prices = [];

        foreach (TransitLeg::values() as $leg) {
            $value = $saved[$leg] ?? null;
            $prices[$leg] = $value === null ? null : (float) $value;
        }

        return $prices;
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
