<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A plan operators can be put on. For now it is a label plus a student limit
 * the platform team can see being exceeded — nothing is billed or blocked.
 */
class Plan extends Model
{
    protected $fillable = [
        'name',
        'code',
        'student_limit',
        'monthly_price',
        'price_per_student',
        'is_default',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'student_limit' => 'integer',
        'monthly_price' => 'decimal:2',
        'price_per_student' => 'decimal:2',
        'is_default' => 'boolean',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    /** What new sign-ups start on. */
    public static function default(): ?self
    {
        return static::query()->where('is_default', true)->first();
    }

    public function operators(): HasMany
    {
        return $this->hasMany(BusOperator::class);
    }
}
