<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The first month the extra is billed (1st of a month). Bills cover whole
        // months, so a plan starting mid-month is either billed that month or from the next.
        Schema::table('student_extras', function (Blueprint $table) {
            $table->date('billing_starts_on')->nullable()->after('ends_on');
        });

        foreach (DB::table('student_extras')->get(['id', 'starts_on']) as $extra) {
            DB::table('student_extras')->where('id', $extra->id)
                ->update(['billing_starts_on' => substr((string) $extra->starts_on, 0, 7).'-01']);
        }

        // Which extra a bill line came from, so a line is never added twice and
        // can be taken off an unpaid bill when the plan ends early.
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->foreignId('student_extra_id')->nullable()->after('invoice_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('student_extra_id');
        });
        Schema::table('student_extras', function (Blueprint $table) {
            $table->dropColumn('billing_starts_on');
        });
    }
};
