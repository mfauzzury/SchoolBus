<?php

namespace App\Models;

use App\Enums\BillingPeriod;
use App\Enums\PackageType;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentApplication extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'parent_id',
        'full_name',
        'date_of_birth',
        'school_name',
        'package_type',
        'billing_period',
        'status',
        'route_id',
        'fee_override',
        'rejection_reason',
        'reviewed_by',
        'reviewed_at',
        'resulting_student_id',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'package_type' => PackageType::class,
        'billing_period' => BillingPeriod::class,
        'fee_override' => 'decimal:2',
        'reviewed_at' => 'datetime',
    ];

    public function parentProfile(): BelongsTo
    {
        return $this->belongsTo(ParentProfile::class, 'parent_id');
    }

    public function route(): BelongsTo
    {
        return $this->belongsTo(Route::class);
    }

    public function resultingStudent(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'resulting_student_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
