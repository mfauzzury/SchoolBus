<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One leg of a child's day that differs from their normal route — see the
 * create_student_rides_table migration for how rides replace the normal trip.
 */
class StudentRide extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'student_id',
        'transit_request_id',
        'direction',
        'route_id',
        'board_stop_id',
        'alight_stop_id',
        'starts_on',
        'ends_on',
    ];

    protected $casts = [
        'starts_on' => 'date',
        'ends_on' => 'date',
    ];

    public function scopeActiveOn(Builder $query, CarbonInterface $date): Builder
    {
        $day = $date->toDateString();

        return $query->whereDate('starts_on', '<=', $day)
            ->where(fn (Builder $q) => $q->whereNull('ends_on')->orWhereDate('ends_on', '>=', $day));
    }

    public function transitRequest(): BelongsTo
    {
        return $this->belongsTo(TransitRequest::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function route(): BelongsTo
    {
        return $this->belongsTo(Route::class);
    }

    public function boardStop(): BelongsTo
    {
        return $this->belongsTo(RouteStop::class, 'board_stop_id');
    }

    public function alightStop(): BelongsTo
    {
        return $this->belongsTo(RouteStop::class, 'alight_stop_id');
    }
}
