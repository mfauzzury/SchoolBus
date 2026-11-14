<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A ride is a change from a child's normal trip in one direction, for
     * example "after school, ride route A to the transit center, then route B
     * from the transit center home". A child with no rides for a direction
     * rides their own route as usual (students.route_id / pickup_stop_id).
     * As soon as a child has a ride for a direction, the rides for that
     * direction replace the normal trip.
     *
     * A null stop means the school end of the route.
     */
    public function up(): void
    {
        Schema::create('student_rides', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('bus_operators')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            // Matches trips.direction: 'pickup' (towards school) or 'dropoff' (after school).
            $table->string('direction');
            $table->foreignId('route_id')->constrained()->cascadeOnDelete();
            $table->foreignId('board_stop_id')->nullable()->constrained('route_stops')->nullOnDelete();
            $table->foreignId('alight_stop_id')->nullable()->constrained('route_stops')->nullOnDelete();
            $table->date('starts_on');
            $table->date('ends_on')->nullable();
            $table->timestamps();

            $table->index('tenant_id');
            $table->index(['route_id', 'direction']);
            $table->index(['student_id', 'direction']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_rides');
    }
};
