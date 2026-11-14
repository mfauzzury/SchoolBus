<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A monthly charge on top of the bus fee — see the create_student_extras_table migration. */
class StudentExtra extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'student_id',
        'transit_request_id',
        'label',
        'monthly_amount',
        'starts_on',
        'ends_on',
    ];

    protected $casts = [
        'monthly_amount' => 'decimal:2',
        'starts_on' => 'date',
        'ends_on' => 'date',
    ];

    /** Still running on (or after) this day: not ended before it. */
    public function scopeNotEndedBy(Builder $query, CarbonInterface $date): Builder
    {
        return $query->where(fn (Builder $q) => $q->whereNull('ends_on')->orWhereDate('ends_on', '>=', $date->toDateString()));
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function transitRequest(): BelongsTo
    {
        return $this->belongsTo(TransitRequest::class);
    }
}
