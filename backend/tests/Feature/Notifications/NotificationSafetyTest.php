<?php

namespace Tests\Feature\Notifications;

use App\Models\NotificationLog;
use App\Notifications\ApplicationDecided;
use App\Notifications\ApplicationReceived;
use App\Notifications\BillsIssued;
use App\Notifications\NotificationType;
use App\Notifications\OperatorSignedUp;
use App\Services\Notifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class NotificationSafetyTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private function html(object $notification): string
    {
        return (string) $notification->toMail(new AnonymousNotifiable)->render();
    }

    public function test_text_typed_by_users_cannot_inject_links_or_images_into_emails(): void
    {
        $evil = '[Click here](http://evil.test) ![x](http://evil.test/p.png)';

        $emails = [
            new BillsIssued($evil, $evil, [['student' => $evil, 'amount' => '10', 'due_date' => '2026-10-20']]),
            new ApplicationReceived($evil, $evil, $evil),
            new ApplicationDecided(false, $evil, $evil, $evil, $evil),
            new OperatorSignedUp(1, $evil, $evil, $evil, $evil),
        ];

        foreach ($emails as $email) {
            $html = $this->html($email);
            $this->assertStringNotContainsString('href="http://evil.test', $html, $email::class);
            $this->assertStringNotContainsString('src="http://evil.test', $html, $email::class);
        }
    }

    public function test_a_notification_survives_a_real_queue_and_is_marked_sent_by_the_worker(): void
    {
        $this->travelTo(Carbon::parse('2026-10-14 12:00:00', 'Asia/Kuala_Lumpur'));
        config(['queue.default' => 'database']);

        app(Notifier::class)->send(
            NotificationType::BILL_ISSUED,
            'aminah@example.test',
            'Aminah',
            new BillsIssued('Alpha Buses', 'Aminah', [['student' => 'Ali', 'amount' => '150', 'due_date' => '2026-10-20']]),
            'Ali - RM 150.00',
        );

        // Handed to the queue, not sent inline.
        $this->assertSame(1, DB::table('jobs')->count());
        $this->assertSame('queued', NotificationLog::sole()->status);

        $this->artisan('queue:work', ['--once' => true])->assertSuccessful();

        $this->assertSame(0, DB::table('jobs')->count());
        $this->assertSame('sent', NotificationLog::sole()->status);
    }

    public function test_a_parent_email_made_at_night_waits_in_the_queue_until_morning(): void
    {
        $this->travelTo(Carbon::parse('2026-10-14 23:00:00', 'Asia/Kuala_Lumpur'));
        config(['queue.default' => 'database']);

        app(Notifier::class)->send(
            NotificationType::BILL_ISSUED,
            'aminah@example.test',
            'Aminah',
            new BillsIssued('Alpha Buses', 'Aminah', [['student' => 'Ali', 'amount' => '150', 'due_date' => '2026-10-20']]),
            'Ali - RM 150.00',
        );

        $availableAt = Carbon::createFromTimestamp(DB::table('jobs')->value('available_at'), 'Asia/Kuala_Lumpur');
        $this->assertSame('2026-10-15 09:00', $availableAt->format('Y-m-d H:i'));

        // The worker must not pick it up yet.
        $this->artisan('queue:work', ['--once' => true])->assertSuccessful();
        $this->assertSame('queued', NotificationLog::sole()->status);
    }

    public function test_operator_signups_are_rate_limited_so_they_cannot_flood_the_owners_inbox(): void
    {
        $this->ensureRole('operator_admin');
        $this->createPlatformUser('owner', ['email' => 'owner@school.test']);

        $signup = fn (int $i) => $this->fromFrontend()->postJson('/api/register-operator', [
            'company_name' => "Spam Co {$i}", 'contact_person' => 'Bot', 'contact_phone' => '0123456789',
            'email' => "spam{$i}@example.test", 'password' => 'password1',
        ]);

        // Signing up logs the visitor in. Staying logged in must not earn a fresh allowance.
        foreach (range(1, 5) as $i) {
            $signup($i)->assertCreated();
        }

        $signup(6)->assertStatus(429);
        $this->assertSame(5, NotificationLog::where('type', 'operator_signed_up')->count());
    }

    public function test_a_parent_cannot_send_applications_in_bulk(): void
    {
        $tenant = $this->createTenant();
        $this->createOperatorAdmin($tenant);
        [$parent] = $this->createParent($tenant);

        $apply = fn () => $this->actingAs($parent)->postJson('/api/parent/student-applications', [
            'full_name' => 'Ali', 'date_of_birth' => '2018-03-04', 'school_name' => 'SK Maju', 'package_type' => 'return',
        ]);

        foreach (range(1, 10) as $i) {
            $apply()->assertCreated();
        }

        $apply()->assertStatus(429);
    }
}
