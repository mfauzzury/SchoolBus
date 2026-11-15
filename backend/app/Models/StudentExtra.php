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
        'billing_starts_on',
    ];

    protected $casts = [
        'monthly_amount' => 'decimal:2',
        'starts_on' => 'date:Y-m-d',
        'ends_on' => 'date:Y-m-d',
        'billing_starts_on' => 'date:Y-m-d',
    ];

    /** Still running on (or after) this day: not ended before it. */
    public function scopeNotEndedBy(Builder $query, CarbonInterface $date): Builder
    {
        return $query->where(fn (Builder $q) => $q->whereNull('ends_on')->orWhereDate('ends_on', '>=', $date->toDateString()));
    }

    /**
     * Billed in this month: billing has started by then and the plan hasn't
     * ended before the month began. Bills cover whole months.
     */
    public function scopeBilledInMonth(Builder $query, CarbonInterface $month): Builder
    {
        $start = $month->copy()->startOfMonth()->toDateString();

        return $query->where('monthly_amount', '>', 0)
            ->whereNotNull('billing_starts_on')
            ->whereDate('billing_starts_on', '<=', $start)
            ->where(fn (Builder $q) => $q->whereNull('ends_on')->orWhereDate('ends_on', '>=', $start));
    }

    /** How this charge is listed before it is billed (Next bills, next-bill preview). */
    public function asLine(): array
    {
        return ['label' => $this->label, 'amount' => (float) $this->monthly_amount];
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
