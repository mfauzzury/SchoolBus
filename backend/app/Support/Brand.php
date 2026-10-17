<?php

namespace App\Support;

use App\Models\BrandSetting;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * The platform's brand as the web app, the mobile apps and the emails see it.
 *
 * Whatever the Owner has not set falls back to the built-in BasSekolah brand: the
 * name from config, and a null image URL, which tells each client to use the mark
 * it ships with. Each image comes as a PNG/JPG/WebP, which emails, the mobile apps
 * and the browser tab use, and optionally an SVG, which the website prefers because
 * it stays sharp at any size. Image URLs are absolute (the mobile apps can't use a relative
 * one) and carry a version, so a new upload is never hidden by a cached old one.
 */
class Brand
{
    private static function setting(): ?BrandSetting
    {
        // A brand problem must never break a page or an email: fall back to the default.
        try {
            return BrandSetting::find(1);
        } catch (Throwable) {
            return null;
        }
    }

    public static function name(): string
    {
        $name = self::setting()?->name;

        return filled($name) ? $name : (string) config('app.name');
    }

    public static function iconUrl(): ?string
    {
        return self::url(self::setting(), 'icon_path');
    }

    public static function logoUrl(): ?string
    {
        return self::url(self::setting(), 'logo_path');
    }

    /** @return array{name: string, icon_url: string|null, icon_svg_url: string|null, logo_url: string|null, logo_svg_url: string|null, version: int|null} */
    public static function toArray(): array
    {
        $setting = self::setting();

        return [
            'name' => self::name(),
            'icon_url' => self::url($setting, 'icon_path'),
            'icon_svg_url' => self::url($setting, 'icon_svg_path'),
            'logo_url' => self::url($setting, 'logo_path'),
            'logo_svg_url' => self::url($setting, 'logo_svg_path'),
            // Changes whenever the brand does, so clients know to refresh what they cached.
            'version' => $setting?->updated_at?->getTimestamp(),
        ];
    }

    private static function url(?BrandSetting $setting, string $column): ?string
    {
        $path = $setting?->{$column};

        if (! $path) {
            return null;
        }

        $url = Storage::disk('public')->url($path);
        // The mobile apps need a full address; a disk configured without one would give "/storage/...".
        if (! preg_match('#^https?://#', $url)) {
            $url = rtrim((string) config('app.url'), '/').'/'.ltrim($url, '/');
        }

        return $url.'?v='.$setting->updated_at?->getTimestamp();
    }
}
