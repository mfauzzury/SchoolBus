<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One row per outside service the platform uses ('brevo', 'whatsapp').
        // `settings` holds the credentials as an encrypted blob.
        Schema::create('integration_settings', function (Blueprint $table) {
            $table->string('provider')->primary();
            $table->boolean('enabled')->default(false);
            $table->longText('settings')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integration_settings');
    }
};
