<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bus_operators', function (Blueprint $table) {
            // All optional. Shown to parents on receipts and the operator card.
            $table->string('legal_name')->nullable();
            $table->string('ssm_number', 50)->nullable();
            $table->string('address_line1')->nullable();
            $table->string('address_line2')->nullable();
            $table->string('postcode', 10)->nullable();
            $table->string('city', 100)->nullable();
            $table->string('state', 50)->nullable();
            $table->string('whatsapp_number', 30)->nullable();
            $table->string('payment_note', 300)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('bus_operators', function (Blueprint $table) {
            $table->dropColumn([
                'legal_name', 'ssm_number', 'address_line1', 'address_line2',
                'postcode', 'city', 'state', 'whatsapp_number', 'payment_note',
            ]);
        });
    }
};
