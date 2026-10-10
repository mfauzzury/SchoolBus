<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            // Empty = unlimited. A label and a warning for now; nothing is blocked.
            $table->unsignedInteger('student_limit')->nullable();
            // Shown, not charged: operators are not billed yet.
            $table->decimal('monthly_price', 10, 2)->default(0);
            $table->decimal('price_per_student', 10, 2)->default(0);
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        $now = now();
        $freeId = DB::table('plans')->insertGetId([
            'name' => 'Free',
            'code' => 'free',
            'student_limit' => 30,
            'monthly_price' => 0,
            'price_per_student' => 0,
            'is_default' => true,
            'is_active' => true,
            'sort_order' => 0,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        Schema::table('bus_operators', function (Blueprint $table) {
            $table->foreignId('plan_id')->nullable()->after('subscription_plan')
                ->constrained('plans')->restrictOnDelete();
        });

        // Carry over whatever label each operator had so nobody changes plan silently.
        $codes = DB::table('bus_operators')->distinct()->pluck('subscription_plan');
        foreach ($codes as $code) {
            $planId = $code === 'free' || blank($code)
                ? $freeId
                : (DB::table('plans')->where('code', $code)->value('id') ?? DB::table('plans')->insertGetId([
                    'name' => ucfirst((string) $code),
                    'code' => $code,
                    'student_limit' => null,
                    'monthly_price' => 0,
                    'price_per_student' => 0,
                    'is_default' => false,
                    'is_active' => true,
                    'sort_order' => 10,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]));

            DB::table('bus_operators')->where('subscription_plan', $code)->update(['plan_id' => $planId]);
        }
        DB::table('bus_operators')->whereNull('plan_id')->update(['plan_id' => $freeId]);

        Schema::table('bus_operators', function (Blueprint $table) {
            $table->dropColumn('subscription_plan');
        });
    }

    public function down(): void
    {
        Schema::table('bus_operators', function (Blueprint $table) {
            $table->string('subscription_plan')->default('free');
        });

        DB::table('bus_operators')
            ->join('plans', 'plans.id', '=', 'bus_operators.plan_id')
            ->get(['bus_operators.id', 'plans.code'])
            ->each(fn ($row) => DB::table('bus_operators')->where('id', $row->id)->update(['subscription_plan' => $row->code]));

        Schema::table('bus_operators', function (Blueprint $table) {
            $table->dropConstrainedForeignId('plan_id');
        });

        Schema::dropIfExists('plans');
    }
};
