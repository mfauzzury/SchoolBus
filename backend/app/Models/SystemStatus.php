<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * "When did X last happen, and how did it go" — one row per fact, overwritten each time.
 */
class SystemStatus extends Model
{
    public $incrementing = false;

    protected $primaryKey = 'key';

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = ['key', 'value', 'updated_at'];

    protected $casts = [
        'value' => 'array',
        'updated_at' => 'datetime',
    ];

    public static function record(string $key, array $value = []): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value, 'updated_at' => now()]);
    }

    public static function read(string $key): ?self
    {
        return static::find($key);
    }
}
