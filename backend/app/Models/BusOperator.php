<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class BusOperator extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_name',
        'operator_code',
        'contact_person',
        'contact_phone',
        'email',
        'bank_details',
        'logo_path',
        'subscription_plan',
        'discount_config',
    ];

    protected $casts = [
        'bank_details' => 'array',
        'discount_config' => 'array',
    ];

    protected $appends = ['logo_url'];

    protected function logoUrl(): Attribute
    {
        return Attribute::get(
            fn () => $this->logo_path ? Storage::disk('public')->url($this->logo_path) : null,
        );
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $operator) {
            if (empty($operator->operator_code)) {
                $operator->operator_code = $operator->generateUniqueOperatorCode();
            }
        });
    }

    /**
     * The 4-digit code parents enter on the landing page to find their operator
     * (spec §6.2 step 1's "registration link" made human-shareable — no URL to send).
     */
    private function generateUniqueOperatorCode(): string
    {
        do {
            $code = str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
        } while (self::where('operator_code', $code)->exists());

        return $code;
    }

    public const DEFAULT_DISCOUNT_CONFIG = [
        'billing_periods' => [
            'monthly' => 0,
            'quarterly' => 5,
            'half_year' => 10,
            'yearly' => 15,
        ],
        'sibling_discounts' => [
            '1' => 0,
            '2' => 10,
            '3' => 15,
        ],
    ];

    /**
     * The operator's discount config merged over the spec's default rates,
     * so unset tenants (and partially-configured ones) still behave sensibly.
     */
    public function resolvedDiscountConfig(): array
    {
        $config = $this->discount_config ?? [];

        return [
            'billing_periods' => array_replace(
                self::DEFAULT_DISCOUNT_CONFIG['billing_periods'],
                $config['billing_periods'] ?? [],
            ),
            // array_replace (not array_merge) — sibling tier keys ('1','2','3') are
            // numeric strings, and array_merge silently reindexes numeric keys from 0.
            'sibling_discounts' => array_replace(
                self::DEFAULT_DISCOUNT_CONFIG['sibling_discounts'],
                $config['sibling_discounts'] ?? [],
            ),
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'tenant_id');
    }

    public function buses(): HasMany
    {
        return $this->hasMany(Bus::class, 'tenant_id');
    }

    public function routes(): HasMany
    {
        return $this->hasMany(Route::class, 'tenant_id');
    }

    public function staff(): HasMany
    {
        return $this->hasMany(Staff::class, 'tenant_id');
    }

    public function parents(): HasMany
    {
        return $this->hasMany(ParentProfile::class, 'tenant_id');
    }

    public function students(): HasMany
    {
        return $this->hasMany(Student::class, 'tenant_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class, 'tenant_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'tenant_id');
    }
}
