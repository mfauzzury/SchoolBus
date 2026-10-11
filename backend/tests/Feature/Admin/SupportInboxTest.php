<?php

namespace Tests\Feature\Admin;

use App\Models\ActivityLog;
use App\Models\Announcement;
use App\Models\ContactMessage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class SupportInboxTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private function message(array $overrides = []): ContactMessage
    {
        return ContactMessage::create([
            'name' => 'Aminah',
            'email' => 'aminah@example.test',
            'phone' => '0123456789',
            'message' => 'How do I add a bus?',
            ...$overrides,
        ]);
    }

    public function test_support_lists_open_and_handled_messages_newest_first(): void
    {
        $support = $this->createPlatformUser('support');
        $old = $this->message(['name' => 'Old']);
        $new = $this->message(['name' => 'New']);
        $done = $this->message(['name' => 'Done']);
        $done->forceFill(['handled_at' => now(), 'handled_by' => $support->id])->save();

        $open = $this->actingAs($support)->getJson('/api/admin/inbox?status=open')->assertOk();
        $open->assertJsonPath('total', 2);
        $this->assertSame(['New', 'Old'], collect($open->json('data'))->pluck('name')->all());

        $handled = $this->actingAs($support)->getJson('/api/admin/inbox?status=handled')->assertOk();
        $handled->assertJsonPath('total', 1)->assertJsonPath('data.0.handler.name', $support->name);

        $this->actingAs($support)->getJson('/api/admin/inbox')->assertJsonPath('total', 3);
    }

    public function test_summary_counts_only_open_messages(): void
    {
        $support = $this->createPlatformUser('support');
        $this->message();
        $this->message();
        $this->message()->forceFill(['handled_at' => now()])->save();

        $this->actingAs($support)->getJson('/api/admin/inbox/summary')->assertOk()->assertJsonPath('open', 2);
    }

    public function test_a_message_can_be_marked_handled_and_reopened(): void
    {
        $support = $this->createPlatformUser('support');
        $message = $this->message();

        $this->actingAs($support)->postJson("/api/admin/inbox/{$message->id}/handle")
            ->assertOk()->assertJsonPath('handler.id', $support->id);
        $this->assertNotNull($message->fresh()->handled_at);
        $this->assertTrue(ActivityLog::where('action', 'contact_message_handled')->exists());

        $this->actingAs($support)->postJson("/api/admin/inbox/{$message->id}/reopen")->assertOk();
        $fresh = $message->fresh();
        $this->assertNull($fresh->handled_at);
        $this->assertNull($fresh->handled_by);
    }

    public function test_show_returns_the_full_message(): void
    {
        $owner = $this->createPlatformUser('owner');
        $message = $this->message(['message' => str_repeat('long ', 200)]);

        $this->actingAs($owner)->getJson("/api/admin/inbox/{$message->id}")
            ->assertOk()->assertJsonPath('email', 'aminah@example.test');
    }

    public function test_finance_cannot_read_the_inbox(): void
    {
        $finance = $this->createPlatformUser('finance');
        $message = $this->message();

        $this->actingAs($finance)->getJson('/api/admin/inbox')->assertForbidden();
        $this->actingAs($finance)->getJson('/api/admin/inbox/summary')->assertForbidden();
        $this->actingAs($finance)->postJson("/api/admin/inbox/{$message->id}/handle")->assertForbidden();
    }

    public function test_the_public_contact_form_still_creates_an_open_message(): void
    {
        $this->postJson('/api/contact', [
            'name' => 'Visitor', 'email' => 'v@example.test', 'message' => 'Hello',
        ])->assertCreated();

        $this->assertNull(ContactMessage::firstWhere('name', 'Visitor')->handled_at);
    }

    // ---- announcements ----

    private function announcementPayload(array $overrides = []): array
    {
        return [
            'title' => 'Maintenance tonight',
            'body' => 'SchoolBus will be offline from 12am to 1am.',
            'title_ms' => 'Penyelenggaraan malam ini',
            'body_ms' => 'SchoolBus tidak tersedia dari 12 hingga 1 pagi.',
            ...$overrides,
        ];
    }

    public function test_support_creates_edits_and_deletes_an_announcement(): void
    {
        $support = $this->createPlatformUser('support');

        $id = $this->actingAs($support)->postJson('/api/admin/announcements', $this->announcementPayload())
            ->assertCreated()->assertJsonPath('status', 'live')->json('id');
        $this->assertSame($support->id, Announcement::find($id)->created_by);

        $this->actingAs($support)->putJson("/api/admin/announcements/{$id}", $this->announcementPayload(['title' => 'Changed']))
            ->assertOk()->assertJsonPath('title', 'Changed');

        $this->actingAs($support)->deleteJson("/api/admin/announcements/{$id}")->assertNoContent();
        $this->assertDatabaseMissing('announcements', ['id' => $id]);
        $this->assertTrue(ActivityLog::where('action', 'announcement_created')->exists());
        $this->assertTrue(ActivityLog::where('action', 'announcement_deleted')->exists());
    }

    public function test_announcement_text_is_kept_short_and_the_end_must_follow_the_start(): void
    {
        $support = $this->createPlatformUser('support');

        $this->actingAs($support)->postJson('/api/admin/announcements', $this->announcementPayload(['body' => str_repeat('x', 501)]))
            ->assertStatus(422)->assertJsonValidationErrors('body');
        $this->actingAs($support)->postJson('/api/admin/announcements', $this->announcementPayload([
            'starts_at' => '2026-12-02 00:00:00', 'ends_at' => '2026-12-01 00:00:00',
        ]))->assertStatus(422)->assertJsonValidationErrors('ends_at');
        $this->actingAs($support)->postJson('/api/admin/announcements', ['title' => 'No body'])
            ->assertStatus(422)->assertJsonValidationErrors('body');
    }

    public function test_status_is_scheduled_live_or_ended(): void
    {
        $support = $this->createPlatformUser('support');
        Announcement::create($this->announcementPayload(['title' => 'Soon', 'starts_at' => now()->addDay()]));
        Announcement::create($this->announcementPayload(['title' => 'Now']));
        Announcement::create($this->announcementPayload(['title' => 'Over', 'starts_at' => now()->subDays(3), 'ends_at' => now()->subDay()]));

        $statuses = collect($this->actingAs($support)->getJson('/api/admin/announcements')->json())
            ->pluck('status', 'title')->all();

        $this->assertEquals(['Soon' => 'scheduled', 'Now' => 'live', 'Over' => 'ended'], $statuses);
    }

    public function test_operators_only_receive_announcements_that_are_live(): void
    {
        $tenant = $this->createTenant();
        $operator = $this->createOperatorAdmin($tenant);
        Announcement::create($this->announcementPayload(['title' => 'Soon', 'starts_at' => now()->addDay()]));
        Announcement::create($this->announcementPayload(['title' => 'Now']));
        Announcement::create($this->announcementPayload(['title' => 'Windowed', 'starts_at' => now()->subHour(), 'ends_at' => now()->addHour()]));
        Announcement::create($this->announcementPayload(['title' => 'Over', 'ends_at' => now()->subMinute()]));

        $titles = collect($this->actingAs($operator)->getJson('/api/operator/announcements/active')->assertOk()->json())
            ->pluck('title')->sort()->values()->all();

        $this->assertSame(['Now', 'Windowed'], $titles);
    }

    public function test_the_operator_feed_exposes_only_what_the_banner_needs(): void
    {
        $tenant = $this->createTenant();
        $operator = $this->createOperatorAdmin($tenant);
        $creator = $this->createPlatformUser('support');
        Announcement::create([...$this->announcementPayload(), 'created_by' => $creator->id]);

        $row = $this->actingAs($operator)->getJson('/api/operator/announcements/active')->json('0');

        $this->assertEqualsCanonicalizing(['id', 'title', 'body', 'title_ms', 'body_ms'], array_keys($row));
    }

    public function test_finance_cannot_manage_announcements_and_parents_cannot_read_the_operator_feed(): void
    {
        $finance = $this->createPlatformUser('finance');
        $this->actingAs($finance)->postJson('/api/admin/announcements', $this->announcementPayload())->assertForbidden();

        $tenant = $this->createTenant();
        [$parent] = $this->createParent($tenant);
        $this->actingAs($parent)->getJson('/api/operator/announcements/active')->assertForbidden();
    }
}
