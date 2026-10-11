<?php

namespace Tests\Feature\Admin;

use App\Models\ActivityLog;
use App\Models\NotificationLog;
use App\Models\NotificationSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class NotificationAdminTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private function log(array $overrides = []): NotificationLog
    {
        return NotificationLog::create([
            'type' => 'bill_issued', 'recipient' => 'aminah@example.test', 'recipient_name' => 'Aminah',
            'subject' => 'New bill', 'summary' => 'Ali - RM 150.00', 'status' => 'sent',
            ...$overrides,
        ]);
    }

    public function test_only_the_owner_can_see_or_change_messages(): void
    {
        foreach (['finance', 'support'] as $level) {
            $user = $this->createPlatformUser($level);

            $this->actingAs($user)->getJson('/api/admin/notifications')->assertForbidden();
            $this->actingAs($user)->getJson('/api/admin/notifications/log')->assertForbidden();
            $this->actingAs($user)->putJson('/api/admin/notifications/bill_issued', ['enabled' => false])->assertForbidden();
        }
    }

    public function test_every_message_type_is_listed_with_30_day_counts(): void
    {
        $owner = $this->createPlatformUser('owner');
        $this->log();
        $this->log(['status' => 'failed']);
        $this->log(['type' => 'payment_received']);
        // created_at isn't mass-assignable, so backdate after creating.
        $this->log()->forceFill(['created_at' => now()->subDays(40)])->save();

        $response = $this->actingAs($owner)->getJson('/api/admin/notifications')->assertOk();
        $types = collect($response->json('types'))->keyBy('type');

        $this->assertCount(7, $types);
        $this->assertSame(1, $types['bill_issued']['sent']);
        $this->assertSame(1, $types['bill_issued']['failed']);
        $this->assertSame(1, $types['payment_received']['sent']);
        $this->assertTrue($types['reminder_overdue']['enabled']);
        $this->assertSame('parent', $types['bill_issued']['audience']);
    }

    public function test_the_owner_can_switch_a_type_off_and_on_and_it_is_logged(): void
    {
        $owner = $this->createPlatformUser('owner');

        $this->actingAs($owner)->putJson('/api/admin/notifications/reminder_overdue', ['enabled' => false])
            ->assertOk()->assertJsonPath('enabled', false);
        $this->assertFalse(NotificationSetting::isEnabled('reminder_overdue'));

        $listed = collect($this->actingAs($owner)->getJson('/api/admin/notifications')->json('types'))->keyBy('type');
        $this->assertFalse($listed['reminder_overdue']['enabled']);

        $this->actingAs($owner)->putJson('/api/admin/notifications/reminder_overdue', ['enabled' => true])->assertOk();
        $this->assertTrue(NotificationSetting::isEnabled('reminder_overdue'));
        $this->assertSame(2, ActivityLog::where('action', 'notification_type_toggled')->count());
    }

    public function test_an_unknown_type_cannot_be_switched(): void
    {
        $owner = $this->createPlatformUser('owner');

        $this->actingAs($owner)->putJson('/api/admin/notifications/made_up', ['enabled' => false])->assertNotFound();
    }

    public function test_the_log_can_be_filtered_by_status_type_and_recipient(): void
    {
        $owner = $this->createPlatformUser('owner');
        $this->log();
        $this->log(['status' => 'failed', 'recipient' => 'siti@example.test', 'recipient_name' => 'Siti']);
        $this->log(['type' => 'reminder_overdue', 'recipient' => 'zain@example.test', 'recipient_name' => 'Zain']);

        $count = fn (string $query) => $this->actingAs($owner)->getJson("/api/admin/notifications/log?{$query}")
            ->assertOk()->json('total');

        $this->assertSame(3, $count(''));
        $this->assertSame(1, $count('status=failed'));
        $this->assertSame(1, $count('type=reminder_overdue'));
        $this->assertSame(1, $count('search=SITI'));
        $this->assertSame(0, $count('search=%25'));
        $this->actingAs($owner)->getJson('/api/admin/notifications/log?status=bogus')->assertStatus(422);
    }

    public function test_the_page_warns_when_mail_is_only_being_written_to_a_file(): void
    {
        $owner = $this->createPlatformUser('owner');

        config(['mail.default' => 'log']);
        $this->actingAs($owner)->getJson('/api/admin/notifications')->assertJsonPath('delivers', false);

        config(['mail.default' => 'brevo']);
        $this->actingAs($owner)->getJson('/api/admin/notifications')->assertJsonPath('delivers', true);
    }

    public function test_the_system_page_reports_emails_waiting_for_a_queue_worker(): void
    {
        $owner = $this->createPlatformUser('owner');
        config(['queue.default' => 'database']);
        DB::table('jobs')->insert([
            'queue' => 'default', 'payload' => '{}', 'attempts' => 0,
            'available_at' => now()->timestamp, 'created_at' => now()->subHour()->timestamp,
        ]);

        $backlog = $this->actingAs($owner)->getJson('/api/admin/system')->assertOk()->json('queue_backlog');

        $this->assertSame(1, $backlog['waiting']);
        $this->assertNotNull($backlog['oldest_at']);
    }
}
