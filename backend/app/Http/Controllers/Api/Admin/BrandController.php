<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\BrandSetting;
use App\Support\ActivityLog;
use App\Support\Brand;
use enshrined\svgSanitize\Sanitizer;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * The Owner manages the platform brand: its name, a square icon (browser tab,
 * phone) and a wide logo (website header, emails).
 *
 * Each image needs a PNG/JPG/WebP first: emails and the mobile apps can't show
 * SVG. An SVG can then be added for the website, where it is sharpest; it is
 * cleaned of scripts and outside links before it is stored. Removing an image
 * removes both files and goes back to the built-in BasSekolah mark.
 */
class BrandController extends Controller
{
    private const PARTS = ['icon', 'logo'];

    public function show()
    {
        return Brand::toArray();
    }

    public function update(Request $request)
    {
        $data = $request->validate(['name' => 'nullable|string|max:60']);

        // Blank means "back to the built-in name".
        $this->save($request, ['name' => filled($data['name'] ?? null) ? trim($data['name']) : null]);

        ActivityLog::record('brand_updated', properties: ['part' => 'name']);

        return Brand::toArray();
    }

    public function upload(Request $request, string $part)
    {
        abort_unless(in_array($part, self::PARTS, true), 404);

        $request->validate(['file' => 'required|file|max:2048']);
        $file = $request->file('file');

        $isSvg = strtolower($file->getClientOriginalExtension()) === 'svg' || $file->getMimeType() === 'image/svg+xml';

        return $isSvg ? $this->storeSvg($request, $part, $file) : $this->storeImage($request, $part, $file);
    }

    /** Back to the built-in mark (both files), or just drop the SVG with ?format=svg. */
    public function destroy(Request $request, string $part)
    {
        abort_unless(in_array($part, self::PARTS, true), 404);

        $columns = $request->query('format') === 'svg' ? ["{$part}_svg_path"] : ["{$part}_path", "{$part}_svg_path"];
        $brand = BrandSetting::current();

        $changes = [];
        foreach ($columns as $column) {
            if ($brand->{$column}) {
                Storage::disk('public')->delete($brand->{$column});
            }
            $changes[$column] = null;
        }
        $this->save($request, $changes);

        ActivityLog::record('brand_reset', properties: ['part' => $part, 'format' => $request->query('format', 'all')]);

        return Brand::toArray();
    }

    private function storeImage(Request $request, string $part, UploadedFile $file): array
    {
        $request->validate(['file' => 'mimes:png,jpg,jpeg,webp|dimensions:min_width='.($part === 'icon' ? 512 : 300)]);

        [$width, $height] = getimagesize($file->getRealPath()) ?: [0, 0];
        $this->checkShape($part, $width, $height);

        return $this->replace($request, $part, "{$part}_path", $file->store('brand', 'public'));
    }

    private function storeSvg(Request $request, string $part, UploadedFile $file): array
    {
        $brand = BrandSetting::current();
        if (! $brand->{"{$part}_path"}) {
            throw ValidationException::withMessages(['file' => 'Upload a PNG, JPG or WebP first. Emails and the mobile app need it; the SVG is an extra for the website.']);
        }

        $sanitizer = new Sanitizer;
        $sanitizer->removeRemoteReferences(true);
        $clean = $sanitizer->sanitize((string) file_get_contents($file->getRealPath()));

        if (! is_string($clean) || ! str_contains($clean, '<svg')) {
            throw ValidationException::withMessages(['file' => 'This SVG could not be read.']);
        }

        [$width, $height] = $this->svgSize($clean);
        if ($width && $height) {
            $this->checkShape($part, $width, $height);
        }

        $path = 'brand/'.Str::random(40).'.svg';
        Storage::disk('public')->put($path, $clean);

        return $this->replace($request, $part, "{$part}_svg_path", $path);
    }

    private function checkShape(string $part, float $width, float $height): void
    {
        if ($part === 'icon' && abs($width - $height) > 0.5) {
            throw ValidationException::withMessages(['file' => 'The icon must be square (the same width and height).']);
        }
        if ($part === 'logo' && $width <= $height) {
            throw ValidationException::withMessages(['file' => 'The logo must be wider than it is tall.']);
        }
    }

    /** Width and height from the viewBox (or width/height), so an SVG gets the same shape check. */
    private function svgSize(string $svg): array
    {
        if (preg_match('/<svg\b[^>]*\bviewBox\s*=\s*["\']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i', $svg, $m)) {
            return [(float) $m[1], (float) $m[2]];
        }
        if (preg_match('/<svg\b[^>]*\bwidth\s*=\s*["\']([\d.]+)[^>]*\bheight\s*=\s*["\']([\d.]+)/i', $svg, $m)) {
            return [(float) $m[1], (float) $m[2]];
        }

        return [0, 0];
    }

    private function replace(Request $request, string $part, string $column, string $path): array
    {
        $brand = BrandSetting::current();
        $old = $brand->{$column};

        $this->save($request, [$column => $path]);

        if ($old) {
            Storage::disk('public')->delete($old);
        }

        ActivityLog::record('brand_updated', properties: ['part' => $part, 'format' => str_ends_with($column, '_svg_path') ? 'svg' : 'image']);

        return Brand::toArray();
    }

    private function save(Request $request, array $changes): void
    {
        $brand = BrandSetting::current();
        $brand->fill($changes + ['updated_by' => $request->user()->id]);
        // Touch it even when only a file changed, so the version (and every cached copy) moves on.
        $brand->updated_at = now();
        $brand->save();
    }
}
