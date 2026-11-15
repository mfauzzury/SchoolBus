<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A transit center asking the operator to start (or stop) carrying a
     * child to and from the center. The operator checks with the parent and
     * approves or rejects; approving a start creates the child's rides and
     * the monthly extra charge.
     */
    public function up(): void
    {
        Schema::create('transit_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('bus_operators')->cascadeOnDelete();
            $table->foreignId('transit_center_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            // 'start' or 'stop'.
            $table->string('kind');
            // Start only: which legs (App\Enums\TransitLeg values).
            $table->json('legs')->nullable();
            // Start only: where the center sits on the child's own route, as the center sees it
            // (after this stop; null = before the first stop).
            $table->foreignId('center_after_stop_id')->nullable()->constrained('route_stops')->nullOnDelete();
            // Start only: when the child leaves the center, e.g. "18:00".
            $table->string('leave_center_at', 5)->nullable();
            $table->text('note')->nullable();
            $table->date('starts_on')->nullable();
            // Stop only: the last day the bus goes via the center.
            $table->date('ends_on')->nullable();
            $table->decimal('indicative_amount', 10, 2)->nullable();
            $table->decimal('approved_amount', 10, 2)->nullable();
            $table->string('status')->default('pending');
            $table->text('rejection_reason')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index('tenant_id');
            $table->index(['student_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transit_requests');
    }
};
