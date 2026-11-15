<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Each transit center has its own monthly add-on per leg (see
     * App\Enums\TransitLeg), set by its operator. Until now the operator had
     * one price list for all its centers in billing settings; any prices set
     * there are copied to the operator's existing centers so nothing is lost.
     */
    public function up(): void
    {
        Schema::table('transit_centers', function (Blueprint $table) {
            $table->json('leg_prices')->nullable()->after('address');
        });

        foreach (DB::table('bus_operators')->get(['id', 'billing_config']) as $operator) {
            $config = json_decode((string) $operator->billing_config, true);
            $prices = is_array($config) ? ($config['transit_prices'] ?? null) : null;

            if (! is_array($prices) || ! array_filter($prices, fn ($price) => $price !== null)) {
                continue;
            }

            DB::table('transit_centers')
                ->where('tenant_id', $operator->id)
                ->whereNull('leg_prices')
                ->update(['leg_prices' => json_encode($prices)]);
        }
    }

    public function down(): void
    {
        Schema::table('transit_centers', function (Blueprint $table) {
            $table->dropColumn('leg_prices');
        });
    }
};
