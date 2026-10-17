<?php

namespace Tests\Feature\Admin;

use App\Models\BrandSetting;
use App\Models\User;
use App\Notifications\BillsIssued;
use App\Support\Brand;
use App\Support\MailText;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class BrandTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    private function owner(): User
    {
        return $this->createPlatformUser('owner');
    }

    private function svg(string $body, string $viewBox = '0 0 200 60'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('logo.svg', "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"{$viewBox}\">{$body}</svg>");
    }

    public function test_anyone_can_read_the_brand_and_it_defaults_to_the_built_in_one(): void
    {
        $this->getJson('/api/brand')
            ->assertOk()
            ->assertJson(['name' => config('app.name'), 'icon_url' => null, 'icon_svg_url' => null, 'logo_url' => null, 'logo_svg_url' => null]);
    }

    public function test_only_the_owner_can_change_the_brand(): void
    {
        foreach (['finance', 'support'] as $level) {
            $user = $this->createPlatformUser($level);

            $this->actingAs($user)->putJson('/api/admin/brand', ['name' => 'X'])->assertForbidden();
            $this->actingAs($user)->post('/api/admin/brand/icon', ['file' => UploadedFile::fake()->image('i.png', 512, 512)])->assertForbidden();
            $this->actingAs($user)->deleteJson('/api/admin/brand/logo')->assertForbidden();
        }
    }

    public function test_the_name_can_be_changed_and_blank_goes_back_to_the_built_in_name(): void
    {
        $owner = $this->owner();

        $this->actingAs($owner)->putJson('/api/admin/brand', ['name' => 'BasKita'])->assertOk()->assertJsonPath('name', 'BasKita');
        $this->getJson('/api/brand')->assertJsonPath('name', 'BasKita');

        $this->actingAs($owner)->putJson('/api/admin/brand', ['name' => ''])->assertOk()->assertJsonPath('name', config('app.name'));
    }

    public function test_a_renamed_brand_signs_the_emails(): void
    {
        BrandSetting::current()->fill(['name' => 'BasKita'])->save();

        $html = (string) (new BillsIssued('Shahrul Transport', 'Aminah', [
            ['student' => 'Aiman', 'amount' => '120.00', 'due_date' => '2026-11-07'],
        ]))->toMail(new User)->render();

        $this->assertSame('BasKita', MailText::brand());
        $this->assertStringContainsString('BasKita', $html);
    }

    public function test_a_square_icon_and_a_wide_logo_are_stored_with_absolute_versioned_urls(): void
    {
        $owner = $this->owner();

        $this->actingAs($owner)->post('/api/admin/brand/icon', ['file' => UploadedFile::fake()->image('icon.png', 512, 512)])->assertOk();
        $brand = $this->actingAs($owner)->post('/api/admin/brand/logo', ['file' => UploadedFile::fake()->image('logo.png', 600, 150)])->assertOk();

        $this->assertStringStartsWith('http', $brand->json('icon_url'));
        $this->assertStringContainsString('?v=', $brand->json('logo_url'));
        Storage::disk('public')->assertExists(BrandSetting::current()->icon_path);
        Storage::disk('public')->assertExists(BrandSetting::current()->logo_path);
    }

    public function test_images_with_the_wrong_shape_size_or_type_are_refused(): void
    {
        $owner = $this->owner();
        $upload = fn (string $part, UploadedFile $file) => $this->actingAs($owner)->post("/api/admin/brand/{$part}", ['file' => $file], ['Accept' => 'application/json']);

        $upload('icon', UploadedFile::fake()->image('wide.png', 800, 512))->assertUnprocessable();
        $upload('icon', UploadedFile::fake()->image('small.png', 128, 128))->assertUnprocessable();
        $upload('logo', UploadedFile::fake()->image('tall.png', 300, 600))->assertUnprocessable();
        $upload('logo', UploadedFile::fake()->create('logo.gif', 10, 'image/gif'))->assertUnprocessable();
        $upload('logo', UploadedFile::fake()->image('huge.png', 600, 150)->size(3000))->assertUnprocessable();
        $upload('banner', UploadedFile::fake()->image('x.png', 600, 150))->assertNotFound();
    }

    public function test_an_svg_needs_a_png_first_because_emails_and_mobile_cannot_show_svg(): void
    {
        $owner = $this->owner();

        $this->actingAs($owner)->post('/api/admin/brand/logo', ['file' => $this->svg('<rect width="200" height="60"/>')], ['Accept' => 'application/json'])
            ->assertUnprocessable()->assertJsonValidationErrors('file');

        $this->actingAs($owner)->post('/api/admin/brand/logo', ['file' => UploadedFile::fake()->image('logo.png', 600, 150)]);
        $this->actingAs($owner)->post('/api/admin/brand/logo', ['file' => $this->svg('<rect width="200" height="60"/>')])
            ->assertOk()
            ->assertJsonPath('logo_svg_url', fn ($url) => str_contains($url, '.svg?v='));
    }

    public function test_scripts_and_outside_links_are_stripped_from_an_svg(): void
    {
        $owner = $this->owner();
        $this->actingAs($owner)->post('/api/admin/brand/logo', ['file' => UploadedFile::fake()->image('logo.png', 600, 150)]);

        $this->actingAs($owner)->post('/api/admin/brand/logo', ['file' => $this->svg(
            '<script>alert(1)</script><rect width="200" height="60" onload="alert(2)"/><image href="http://evil.example/x.png"/>',
        )])->assertOk();

        $stored = Storage::disk('public')->get(BrandSetting::current()->logo_svg_path);
        $this->assertStringNotContainsString('<script', $stored);
        $this->assertStringNotContainsString('onload', $stored);
        $this->assertStringNotContainsString('evil.example', $stored);
        $this->assertStringContainsString('<rect', $stored);
    }

    public function test_an_svg_gets_the_same_shape_check(): void
    {
        $owner = $this->owner();
        $this->actingAs($owner)->post('/api/admin/brand/icon', ['file' => UploadedFile::fake()->image('icon.png', 512, 512)]);

        $this->actingAs($owner)->post('/api/admin/brand/icon', ['file' => $this->svg('<rect/>', '0 0 200 60')], ['Accept' => 'application/json'])
            ->assertUnprocessable();
        $this->actingAs($owner)->post('/api/admin/brand/icon', ['file' => $this->svg('<rect/>', '0 0 64 64')])->assertOk();
    }

    public function test_removing_an_image_deletes_its_files_and_returns_to_the_built_in_mark(): void
    {
        $owner = $this->owner();
        $this->actingAs($owner)->post('/api/admin/brand/logo', ['file' => UploadedFile::fake()->image('logo.png', 600, 150)]);
        $this->actingAs($owner)->post('/api/admin/brand/logo', ['file' => $this->svg('<rect width="200" height="60"/>')]);
        $png = BrandSetting::current()->logo_path;
        $svg = BrandSetting::current()->logo_svg_path;

        // Dropping only the SVG keeps the PNG.
        $this->actingAs($owner)->deleteJson('/api/admin/brand/logo?format=svg')->assertOk()->assertJsonPath('logo_svg_url', null);
        Storage::disk('public')->assertMissing($svg);
        Storage::disk('public')->assertExists($png);

        $this->actingAs($owner)->deleteJson('/api/admin/brand/logo')->assertOk()->assertJsonPath('logo_url', null);
        Storage::disk('public')->assertMissing($png);
        $this->assertDatabaseHas('activity_logs', ['action' => 'brand_reset']);
    }

    public function test_a_new_upload_replaces_the_old_file(): void
    {
        $owner = $this->owner();
        $this->actingAs($owner)->post('/api/admin/brand/icon', ['file' => UploadedFile::fake()->image('a.png', 512, 512)]);
        $first = BrandSetting::current()->icon_path;

        $this->actingAs($owner)->post('/api/admin/brand/icon', ['file' => UploadedFile::fake()->image('b.png', 512, 512)]);

        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertExists(BrandSetting::current()->icon_path);
    }

    public function test_emails_show_the_uploaded_logo_with_the_name_as_alt_text_or_the_drawn_mark_without_one(): void
    {
        $render = fn () => (string) (new BillsIssued('Shahrul Transport', 'Aminah', [
            ['student' => 'Aiman', 'amount' => '120.00', 'due_date' => '2026-11-07'],
        ]))->toMail(new User)->render();

        $this->assertStringContainsString('brand-mark', $render());
        $this->assertStringNotContainsString('<img', $render());

        $this->actingAs($this->owner())->post('/api/admin/brand/logo', ['file' => UploadedFile::fake()->image('logo.png', 600, 150)]);
        BrandSetting::current()->fill(['name' => 'BasKita'])->save();

        $html = $render();
        $this->assertStringContainsString('<img src="'.e(Brand::logoUrl()).'"', $html);
        $this->assertStringContainsString('alt="BasKita"', $html);
        $this->assertStringNotContainsString('brand-mark"', $html);
    }

    public function test_the_public_brand_is_always_rechecked_but_unchanged_answers_are_tiny(): void
    {
        $first = $this->getJson('/api/brand')->assertOk();
        $this->assertStringContainsString('no-cache', $first->headers->get('Cache-Control'));
        $etag = $first->headers->get('ETag');

        $this->getJson('/api/brand', ['If-None-Match' => $etag])->assertStatus(304);

        // A change gives a new answer straight away.
        BrandSetting::current()->fill(['name' => 'BasKita'])->save();
        $this->getJson('/api/brand', ['If-None-Match' => $etag])->assertOk()->assertJsonPath('name', 'BasKita');
    }
}
