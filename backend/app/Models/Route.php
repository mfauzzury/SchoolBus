<?php

namespace App\Models;

use App\Enums\PackageType;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Route extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'name',
        'zone',
        'school_destination',
        'bus_id',
        'driver_id',
        'conductor_id',
        'base_monthly_fee',
        'one_way_monthly_fee',
    ];

    /**
     * Monthly price for a package. base_monthly_fee is the return price;
     * one-way falls back to it until the operator sets a separate one.
     */
    public function feeFor(PackageType $package): ?float
    {
        $fee = $package === PackageType::OneWay
            ? ($this->one_way_monthly_fee ?? $this->base_monthly_fee)
            : $this->base_monthly_fee;

        return $fee === null ? null : (float) $fee;
    }

    public function bus(): BelongsTo
    {
        return $this->belongsTo(Bus::class);
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(Staff::class, 'driver_id');
    }

    public function conductor(): BelongsTo
    {
        return $this->belongsTo(Staff::class, 'conductor_id');
    }

    public function stops(): HasMany
    {
        return $this->hasMany(RouteStop::class)->orderBy('sequence');
    }

    public function students(): HasMany
    {
        return $this->hasMany(Student::class);
    }
}
