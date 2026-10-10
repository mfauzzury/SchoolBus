<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('bus_operators')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            // Null only for the instant between inserting the attempt and Billplz
            // returning the bill; unique so a callback can never match two attempts.
            $table->string('billplz_bill_id')->nullable()->unique();
            $table->string('bill_url')->nullable();
            $table->decimal('amount', 10, 2);
            $table->string('status')->default('pending');
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index('tenant_id');
        });

        Schema::create('invoice_payment_attempt', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_attempt_id')->constrained('payment_attempts')->cascadeOnDelete();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            // What this attempt settles of the invoice: the outstanding balance at
            // creation time, so a part-paid invoice isn't charged twice.
            $table->decimal('amount', 10, 2);

            $table->unique(['payment_attempt_id', 'invoice_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_payment_attempt');
        Schema::dropIfExists('payment_attempts');
    }
};
