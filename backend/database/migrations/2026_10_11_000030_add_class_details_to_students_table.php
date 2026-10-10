<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Who to call at school: the child's teacher, their class, and the
     * school's phone number. All optional; parents fill them in themselves.
     */
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('teacher_name')->nullable()->after('school_name');
            $table->string('class_name')->nullable()->after('teacher_name');
            $table->string('school_phone')->nullable()->after('class_name');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['teacher_name', 'class_name', 'school_phone']);
        });
    }
};
