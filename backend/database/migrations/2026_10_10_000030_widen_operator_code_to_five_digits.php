<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Operator codes go from 4 to 5 digits. Existing 4-digit codes get a trailing
     * '0' (1234 -> 12340) so every operator ends up with one uniform, still-unique
     * code. Mixed lengths would make the landing page's auto-lookup ambiguous
     * ("1000" would match before the parent finished typing "10001").
     */
    public function up(): void
    {
        Schema::table('bus_operators', function (Blueprint $table) {
            $table->char('operator_code', 5)->nullable()->change();
        });

        DB::table('bus_operators')
            ->whereNotNull('operator_code')
            ->get(['id', 'operator_code'])
            ->each(function ($row) {
                $code = trim($row->operator_code);
                if (strlen($code) === 4) {
                    DB::table('bus_operators')->where('id', $row->id)->update(['operator_code' => $code.'0']);
                }
            });
    }

    public function down(): void
    {
        DB::table('bus_operators')
            ->whereNotNull('operator_code')
            ->get(['id', 'operator_code'])
            ->each(function ($row) {
                $code = trim($row->operator_code);
                if (strlen($code) === 5 && str_ends_with($code, '0')) {
                    DB::table('bus_operators')->where('id', $row->id)->update(['operator_code' => substr($code, 0, 4)]);
                }
            });

        Schema::table('bus_operators', function (Blueprint $table) {
            $table->char('operator_code', 4)->nullable()->change();
        });
    }
};
