<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bus_operators', function (Blueprint $table) {
            // Secret + X Signature keys are stored with Laravel's `encrypted` cast
            // (ciphertext, hence text) and are only ever set by the platform admin.
            $table->text('billplz_secret_key')->nullable()->after('discount_config');
            $table->text('billplz_x_signature_key')->nullable()->after('billplz_secret_key');
            $table->string('billplz_collection_id')->nullable()->after('billplz_x_signature_key');
            $table->boolean('billplz_sandbox')->default(false)->after('billplz_collection_id');
        });
    }

    public function down(): void
    {
        Schema::table('bus_operators', function (Blueprint $table) {
            $table->dropColumn([
                'billplz_secret_key',
                'billplz_x_signature_key',
                'billplz_collection_id',
                'billplz_sandbox',
            ]);
        });
    }
};
