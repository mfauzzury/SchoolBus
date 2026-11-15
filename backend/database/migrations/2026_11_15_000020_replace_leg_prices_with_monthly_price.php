<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A transit center has one monthly price, whichever parts of the day the
     * bus covers (which parts is just the child's route flow). Prices set per
     * part are added up into that one price: the after-school pair
     * (school to center, center to home) if either is set, else the
     * before-school pair.
     */
    public function up(): void
    {
        Schema::table('transit_centers', function (Blueprint $table) {
            $table->decimal('monthly_price', 10, 2)->nullable()->after('address');
        });

        foreach (DB::table('transit_centers')->whereNotNull('leg_prices')->get(['id', 'leg_prices']) as $center) {
            $prices = json_decode((string) $center->leg_prices, true) ?: [];

            $sum = fn (array $legs) => array_sum(array_map(fn ($leg) => (float) ($prices[$leg] ?? 0), $legs));
            $isSet = fn (array $legs) => count(array_filter($legs, fn ($leg) => ($prices[$leg] ?? null) !== null)) > 0;

            $after = ['school_to_center', 'center_to_home'];
            $before = ['home_to_center', 'center_to_school'];
            $price = $isSet($after) ? $sum($after) : ($isSet($before) ? $sum($before) : null);

            if ($price !== null) {
                DB::table('transit_centers')->where('id', $center->id)->update(['monthly_price' => $price]);
            }
        }

        Schema::table('transit_centers', function (Blueprint $table) {
            $table->dropColumn('leg_prices');
        });
    }

    public function down(): void
    {
        Schema::table('transit_centers', function (Blueprint $table) {
            $table->json('leg_prices')->nullable()->after('address');
        });

        Schema::table('transit_centers', function (Blueprint $table) {
            $table->dropColumn('monthly_price');
        });
    }
};
