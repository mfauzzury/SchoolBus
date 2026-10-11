<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Bus extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'plate_number',
        'model',
        'capacity',
        'engine_capacity',
        'status',
        'avatar_path',
    ];

    protected $appends = ['avatar_url'];

    protected function avatarUrl(): Attribute
    {
        return Attribute::get(
            fn () => $this->avatar_path ? Storage::disk('public')->url($this->avatar_path) : null,
        );
    }

    public function routes(): HasMany
    {
        return $this->hasMany(Route::class);
    }
}
