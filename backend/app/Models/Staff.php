<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

/**
 * Drivers & conductors. Distinct from the "Operator Staff" role on `users`.
 * `user_id` is only ever set for staff with `role = 'driver'` who have been
 * provisioned a mobile-app login (see StaffController::provisionLogin) —
 * conductors and un-provisioned drivers have no `User` counterpart.
 */
class Staff extends Model
{
    use BelongsToTenant, HasFactory;

    protected $table = 'staff';

    protected $fillable = [
        'tenant_id',
        'user_id',
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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function trips(): HasMany
    {
        return $this->hasMany(Trip::class);
    }
}
