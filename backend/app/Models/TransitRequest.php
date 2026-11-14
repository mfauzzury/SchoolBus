<?php

namespace App\Models;

use App\Enums\TransitLeg;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TransitRequest extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'transit_center_id',
        'student_id',
        'kind',
        'legs',
        'center_after_stop_id',
        'leave_center_at',
        'note',
        'starts_on',
        'ends_on',
        'indicative_amount',
        'approved_amount',
        'status',
        'rejection_reason',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'legs' => 'array',
        'starts_on' => 'date',
        'ends_on' => 'date',
        'indicative_amount' => 'decimal:2',
        'approved_amount' => 'decimal:2',
        'reviewed_at' => 'datetime',
    ];

    /** @return list<string> trips.direction values this request touches */
    public function directions(): array
    {
        return array_values(array_unique(array_map(
            fn (string $leg) => TransitLeg::from($leg)->direction(),
            $this->legs ?? [],
        )));
    }

    public function transitCenter(): BelongsTo
    {
        return $this->belongsTo(TransitCenter::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function centerAfterStop(): BelongsTo
    {
        return $this->belongsTo(RouteStop::class, 'center_after_stop_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function rides(): HasMany
    {
        return $this->hasMany(StudentRide::class);
    }

    public function extras(): HasMany
    {
        return $this->hasMany(StudentExtra::class);
    }
}
