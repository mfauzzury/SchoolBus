<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('bus_operators')->cascadeOnDelete();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->string('type');
            $table->string('description');
            // Signed: charges are positive, discounts and reductions negative.
            // The invoice's totals are always the sum of its items.
            $table->decimal('amount', 10, 2);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('tenant_id');
            $table->index('invoice_id');
        });

        // Existing invoices were a single figure; give each the items that add up to it.
        DB::table('invoices')->orderBy('id')->each(function ($invoice) {
            $now = now();

            DB::table('invoice_items')->insert([
                'tenant_id' => $invoice->tenant_id,
                'invoice_id' => $invoice->id,
                'type' => 'fee',
                'description' => 'Bus fee',
                'amount' => $invoice->amount_before_discount,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            if ((float) $invoice->discount_amount > 0) {
                DB::table('invoice_items')->insert([
                    'tenant_id' => $invoice->tenant_id,
                    'invoice_id' => $invoice->id,
                    'type' => 'discount',
                    'description' => 'Discount',
                    'amount' => -1 * (float) $invoice->discount_amount,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_items');
    }
};
