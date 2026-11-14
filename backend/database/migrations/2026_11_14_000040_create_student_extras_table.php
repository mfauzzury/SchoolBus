<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A monthly charge on a child's bill on top of the bus fee, for the months
     * from starts_on to ends_on (e.g. going via a transit center).
     */
    public function up(): void
    {
        Schema::create('student_extras', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('bus_operators')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('transit_request_id')->nullable()->constrained()->nullOnDelete();
            $table->string('label');
            $table->decimal('monthly_amount', 10, 2);
            $table->date('starts_on');
            $table->date('ends_on')->nullable();
            $table->timestamps();

            $table->index('tenant_id');
            $table->index('student_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_extras');
    }
};
