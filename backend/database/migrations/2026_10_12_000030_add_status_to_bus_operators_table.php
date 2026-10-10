<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bus_operators', function (Blueprint $table) {
            // 'active' | 'suspended'. Suspended locks out everyone under the operator.
            $table->string('status')->default('active')->index();
            $table->timestamp('suspended_at')->nullable();
            $table->text('suspended_reason')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('bus_operators', function (Blueprint $table) {
            $table->dropColumn(['status', 'suspended_at', 'suspended_reason']);
        });
    }
};
