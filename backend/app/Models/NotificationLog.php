<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;
use Throwable;

class NotificationLog extends Model
{
    public const QUEUED = 'queued';

    public const SENT = 'sent';

    public const FAILED = 'failed';

    public const SKIPPED = 'skipped';

    protected $fillable = [
        'tenant_id', 'type', 'channel', 'recipient', 'recipient_name', 'subject', 'summary',
        'status', 'reason', 'transport', 'dedupe_key', 'notification_id', 'sent_at',
    ];

    protected $casts = ['sent_at' => 'datetime'];

    public function busOperator(): BelongsTo
    {
        return $this->belongsTo(BusOperator::class, 'tenant_id');
    }

    public static function markSent(?string $notificationId, string $transport): void
    {
        if (! $notificationId) {
            return;
        }

        static::where('notification_id', $notificationId)->update([
            'status' => self::SENT,
            'reason' => null,
            'transport' => $transport,
            'sent_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public static function markFailed(?string $notificationId, Throwable $e): void
    {
        if (! $notificationId) {
            return;
        }

        static::where('notification_id', $notificationId)->update([
            'status' => self::FAILED,
            'reason' => class_basename($e).': '.Str::limit($e->getMessage(), 180, ''),
            'updated_at' => now(),
        ]);
    }
}
