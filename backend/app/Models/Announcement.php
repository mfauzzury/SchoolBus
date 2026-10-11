<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * A short notice shown as a banner to every operator while it is live.
 */
class Announcement extends Model
{
    protected $fillable = [
        'title',
        'body',
        'title_ms',
        'body_ms',
        'starts_at',
        'ends_at',
        'created_by',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
    ];

    protected $appends = ['status'];

    /** Live right now: started (or no start date) and not yet ended (or no end date). */
    public function scopeLive(Builder $query): void
    {
        $query
            ->where(fn (Builder $q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn (Builder $q) => $q->whereNull('ends_at')->orWhere('ends_at', '>', now()));
    }

    /** 'scheduled' | 'live' | 'ended' */
    public function getStatusAttribute(): string
    {
        if ($this->starts_at && $this->starts_at->isFuture()) {
            return 'scheduled';
        }

        if ($this->ends_at && $this->ends_at->lte(now())) {
            return 'ended';
        }

        return 'live';
    }
}
