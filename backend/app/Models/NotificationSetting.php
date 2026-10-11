<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotificationSetting extends Model
{
    public $incrementing = false;

    protected $primaryKey = 'type';

    protected $keyType = 'string';

    protected $fillable = ['type', 'enabled', 'updated_by'];

    protected $casts = ['enabled' => 'boolean'];

    /** Everything is on until the Owner switches it off. */
    public static function isEnabled(string $type): bool
    {
        return static::find($type)?->enabled ?? true;
    }
}
