<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One thing a platform-team member did. Written explicitly from the admin
 * controllers (see App\Support\ActivityLog) — never edited or deleted.
 */
class ActivityLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['user_id', 'tenant_id', 'action', 'properties', 'ip_address'];

    protected $casts = [
        'properties' => 'array',
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function busOperator(): BelongsTo
    {
        return $this->belongsTo(BusOperator::class, 'tenant_id');
    }
}
