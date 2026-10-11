<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One row per message the platform tried to send: the "what did Aminah actually get?" record.
        Schema::create('notification_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained('bus_operators')->nullOnDelete();
            $table->string('type')->index();
            $table->string('channel')->default('mail');
            $table->string('recipient');
            $table->string('recipient_name')->nullable();
            $table->string('subject')->nullable();
            // A short human line about what it was for ("Ali - RM 150.00").
            $table->string('summary')->nullable();
            // queued | sent | failed | skipped
            $table->string('status')->index();
            $table->string('reason')->nullable();
            // The mailer in use when it went out; 'log' means it was written to a file, not delivered.
            $table->string('transport')->nullable();
            // Stops the same message being made twice (e.g. a re-run of the reminder job).
            $table->string('dedupe_key')->nullable()->unique();
            $table->uuid('notification_id')->nullable()->index();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });

        // A row only exists once someone switched a type off (or back on); no row = on.
        Schema::create('notification_settings', function (Blueprint $table) {
            $table->string('type')->primary();
            $table->boolean('enabled')->default(true);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_settings');
        Schema::dropIfExists('notification_logs');
    }
};
