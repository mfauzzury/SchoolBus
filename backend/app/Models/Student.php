<?php

namespace App\Models;

use App\Enums\BillingPeriod;
use App\Enums\PackageType;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Student extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'parent_id',
        'route_id',
        'pickup_stop_id',
        'full_name',
        'date_of_birth',
        'school_name',
        'package_type',
        'billing_period',
        'enrollment_status',
        'fee_override',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'package_type' => PackageType::class,
        'billing_period' => BillingPeriod::class,
        'fee_override' => 'decimal:2',
    ];

    public function parentProfile(): BelongsTo
    {
        return $this->belongsTo(ParentProfile::class, 'parent_id');
    }

    public function route(): BelongsTo
    {
        return $this->belongsTo(Route::class);
    }

    public function pickupStop(): BelongsTo
    {
        return $this->belongsTo(RouteStop::class, 'pickup_stop_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }
}
