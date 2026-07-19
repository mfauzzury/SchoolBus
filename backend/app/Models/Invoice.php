<?php

namespace App\Models;

use App\Enums\BillingPeriod;
use App\Enums\InvoiceStatus;
use App\Enums\PackageType;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
}
