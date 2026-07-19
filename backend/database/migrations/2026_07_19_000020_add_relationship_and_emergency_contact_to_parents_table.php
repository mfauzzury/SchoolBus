<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('parents', function (Blueprint $table) {
            $table->string('relationship')->nullable()->after('full_name');
            $table->string('gender')->nullable()->after('relationship');
            $table->string('emergency_contact_name')->nullable()->after('postcode');
            $table->string('emergency_contact_relationship')->nullable()->after('emergency_contact_name');
            $table->string('emergency_contact_phone')->nullable()->after('emergency_contact_relationship');
        });
    }

    public function down(): void
    {
        Schema::table('parents', function (Blueprint $table) {
            $table->dropColumn([
                'relationship',
                'gender',
                'emergency_contact_name',
                'emergency_contact_relationship',
                'emergency_contact_phone',
            ]);
        });
    }
};
