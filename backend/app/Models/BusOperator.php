<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
        'plan_id',
        'discount_config',
        'billing_config',
    ];

    /**
     * Never serialised: BusOperator is returned wholesale by /me (to every role,
     * parents included) and by the public registration lookup.
     */
    protected $hidden = [
        'billplz_secret_key',
        'billplz_x_signature_key',
        // Platform-team context; the operator/parents only need to know *that* they're suspended.
        'suspended_reason',
    ];

    protected $casts = [
        'bank_details' => 'array',
        'discount_config' => 'array',
        'billing_config' => 'array',
        'billplz_secret_key' => 'encrypted',
        'billplz_x_signature_key' => 'encrypted',
        'billplz_sandbox' => 'boolean',
        'suspended_at' => 'datetime',
    ];

    protected $appends = ['logo_url', 'billplz_enabled'];

    public function isSuspended(): bool
    {
        return $this->status === 'suspended';
    }

    protected function logoUrl(): Attribute
    {
        return Attribute::get(
            fn () => $this->logo_path ? Storage::disk('public')->url($this->logo_path) : null,
        );
    }

    /**
     * Parents can only pay online once the platform admin has entered all three
     * Billplz credentials for this operator (money goes straight to their account).
     */
    public function hasBillplz(): bool
    {
        return filled($this->billplz_secret_key)
            && filled($this->billplz_x_signature_key)
            && filled($this->billplz_collection_id);
    }

    protected function billplzEnabled(): Attribute
    {
        return Attribute::get(fn () => $this->hasBillplz());
    }

    /**
     * What the admin UI may know about the credentials — presence only, never the keys.
     */
    public function billplzSummary(): array
    {
        return [
            'enabled' => $this->hasBillplz(),
            'sandbox' => (bool) $this->billplz_sandbox,
            'collection_id' => $this->billplz_collection_id,
            'has_secret_key' => filled($this->billplz_secret_key),
            'has_x_signature_key' => filled($this->billplz_x_signature_key),
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $operator) {
            if (empty($operator->operator_code)) {
                $operator->operator_code = $operator->generateUniqueOperatorCode();
            }

            // Every operator is on a plan; new ones start on the default.
            if (empty($operator->plan_id)) {
                $operator->plan_id = Plan::default()?->id;
            }
        });
    }

    /**
     * The 5-digit code parents enter on the landing page to find their operator
     * (spec §6.2 step 1's "registration link" made human-shareable — no URL to send).
     */
    private function generateUniqueOperatorCode(): string
    {
        do {
            $code = str_pad((string) random_int(0, 99999), 5, '0', STR_PAD_LEFT);
        } while (self::where('operator_code', $code)->exists());

        return $code;
    }

    public const DEFAULT_DISCOUNT_CONFIG = [
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
            // array_replace (not array_merge) — sibling tier keys ('1','2','3') are
            // numeric strings, and array_merge silently reindexes numeric keys from 0.
            'sibling_discounts' => array_replace(
                self::DEFAULT_DISCOUNT_CONFIG['sibling_discounts'],
                $config['sibling_discounts'] ?? [],
            ),
        ];
    }

    public const DEFAULT_BILLING_CONFIG = [
        'due_day' => 7,
        'billed_months' => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    ];

    /**
     * When bills are due and which months of the year are billed at all
     * (operators untick school-holiday months). Defaults to every month.
     */
    public function resolvedBillingConfig(): array
    {
        $config = $this->billing_config ?? [];

        $months = array_map('intval', $config['billed_months'] ?? self::DEFAULT_BILLING_CONFIG['billed_months']);
        sort($months);

        return [
            'due_day' => (int) ($config['due_day'] ?? self::DEFAULT_BILLING_CONFIG['due_day']),
            'billed_months' => array_values(array_unique($months)),
        ];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function notes(): HasMany
    {
        return $this->hasMany(OperatorNote::class, 'tenant_id');
    }

    /** The operator's owner login — who "log in as operator" and password resets act on. */
    public function adminUser(): ?User
    {
        return $this->users()->operatorOwners()->orderBy('id')->first();
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
