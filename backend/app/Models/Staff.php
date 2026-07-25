<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

/**
 * Drivers & conductors (no login). Distinct from the "Operator Staff" role on `users`.
 */
class Staff extends Model
{
    use BelongsToTenant, HasFactory;

    protected $table = 'staff';

    protected $fillable = [
        'tenant_id',
        'full_name',
        'ic_number',
        'phone',
        'role',
        'license_expiry_date',
        'status',
        'avatar_path',
    ];

    protected $casts = [
        'license_expiry_date' => 'date',
    ];

    protected $appends = ['avatar_url'];

    protected function avatarUrl(): Attribute
    {
        return Attribute::get(
            fn () => $this->avatar_path ? Storage::disk('public')->url($this->avatar_path) : null,
        );
    }

    public function routesAsDriver(): HasMany
    {
        return $this->hasMany(Route::class, 'driver_id');
    }

    public function routesAsConductor(): HasMany
    {
        return $this->hasMany(Route::class, 'conductor_id');
    }
}
