<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** The platform's brand (name, square icon, wide logo). There is only ever one row. */
class BrandSetting extends Model
{
    protected $fillable = ['name', 'icon_path', 'icon_svg_path', 'logo_path', 'logo_svg_path', 'updated_by'];

    public static function current(): self
    {
        return static::query()->firstOrNew(['id' => 1]);
    }
}
