<?php

namespace App\Models;

use App\Enums\BillingPeriod;
use App\Enums\PackageType;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

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
        'gender',
        'avatar_path',
        'school_name',
        'teacher_name',
        'class_name',
        'school_phone',
        'package_type',
        'billing_period',
        'enrollment_status',
        'fee_override',
        'billing_starts_on',
        'billing_ends_on',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'package_type' => PackageType::class,
        'billing_period' => BillingPeriod::class,
        'fee_override' => 'decimal:2',
        'billing_starts_on' => 'date',
        'billing_ends_on' => 'date',
    ];

    protected $appends = ['avatar_url'];

    protected function avatarUrl(): Attribute
    {
        return Attribute::get(
            fn () => $this->avatar_path ? Storage::disk('public')->url($this->avatar_path) : null,
        );
    }

    /**
     * What this student is charged per month before any sibling discount:
     * the operator's custom fee if set, otherwise the route's price for
     * their package. Null when no price can be worked out yet.
     */
    public function monthlyFee(): ?float
    {
        if ($this->fee_override !== null) {
            return (float) $this->fee_override;
        }

        return $this->route?->feeFor($this->package_type);
    }

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
