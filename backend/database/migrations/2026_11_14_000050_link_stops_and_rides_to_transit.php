<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A stop that is a transit center, so the same center is reused on a route.
        Schema::table('route_stops', function (Blueprint $table) {
            $table->foreignId('transit_center_id')->nullable()->after('route_id')->constrained()->nullOnDelete();
        });

        // Which approved request a ride came from, so stopping the plan ends exactly those rides.
        Schema::table('student_rides', function (Blueprint $table) {
            $table->foreignId('transit_request_id')->nullable()->after('student_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('student_rides', function (Blueprint $table) {
            $table->dropConstrainedForeignId('transit_request_id');
        });
        Schema::table('route_stops', function (Blueprint $table) {
            $table->dropConstrainedForeignId('transit_center_id');
        });
    }
};
