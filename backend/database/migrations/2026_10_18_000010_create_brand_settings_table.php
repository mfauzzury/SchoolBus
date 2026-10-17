<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One row: the platform's own brand. Anything left empty falls back to the built-in BasSekolah brand.
        Schema::create('brand_settings', function (Blueprint $table) {
            $table->id();
            $table->string('name', 60)->nullable();
            // Each image has a PNG/JPG/WebP (emails, mobile, browser tab) and an optional SVG (website, sharpest).
            $table->string('icon_path')->nullable();
            $table->string('icon_svg_path')->nullable();
            $table->string('logo_path')->nullable();
            $table->string('logo_svg_path')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('brand_settings');
    }
};
