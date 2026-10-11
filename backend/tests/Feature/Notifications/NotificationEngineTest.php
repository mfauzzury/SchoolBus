<?php

namespace Tests\Feature\Notifications;

use App\Enums\InvoiceStatus;
use App\Models\BusOperator;
use App\Models\NotificationLog;
use App\Models\NotificationSetting;
use App\Models\ParentProfile;
use App\Models\PaymentAttempt;
use App\Models\Student;
use App\Models\StudentApplication;
use App\Services\Notifier;
use App\Services\PaymentAttemptSettler;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class NotificationEngineTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Midday in Malaysia: inside the daytime window, so nothing is delayed.
        $this->travelTo(Carbon::parse('2026-10-14 12:00:00', 'Asia/Kuala_Lumpur'));
    }

    private function logs(string $type): Collection
    {
        return NotificationLog::where('type', $type)->get();
    }

    private function parentWith(BusOperator $tenant, string $email, string $name = 'Aminah'): ParentProfile
    {
        [, $profile] = $this->createParent($tenant, [], ['email' => $email, 'full_name' => $name]);

        return $profile;
    }

    private function billableChild(BusOperator $tenant, ParentProfile $parent, string $name): Student
    {
        return $this->createBillableStudent(
            $tenant,
            ['parent_id' => $parent->id, 'full_name' => $name],
            ['base_monthly_fee' => 150],
        );
    }

    // ---- bills ----

    public function test_the_monthly_run_sends_one_email_per_parent_listing_every_child(): void
    {
        $this->travelTo(Carbon::parse('2026-11-01 12:00:00', 'Asia/Kuala_Lumpur'));
        $tenant = $this->createTenant(['company_name' => 'Alpha Buses']);
        $parent = $this->parentWith($tenant, 'aminah@example.test');
        $this->billableChild($tenant, $parent, 'Ali');
        $this->billableChild($tenant, $parent, 'Siti');
        $other = $this->parentWith($tenant, 'other@example.test', 'Other Parent');
        $this->billableChild($tenant, $other, 'Zain');

        $this->artisan('invoices:generate-recurring')->assertSuccessful();

        $logs = $this->logs('bill_issued');
        $this->assertCount(2, $logs, 'two parents, two emails - not three');
        $mine = $logs->firstWhere('recipient', 'aminah@example.test');
        $this->assertSame('sent', $mine->status);
        $this->assertStringContainsString('Ali', $mine->summary);
        $this->assertStringContainsString('Siti', $mine->summary);
        $this->assertSame($tenant->id, $mine->tenant_id);
    }

    public function test_the_email_is_in_both_languages_and_links_to_the_parents_bills(): void
    {
        $tenant = $this->createTenant(['company_name' => 'Alpha Buses']);
        $parent = $this->parentWith($tenant, 'aminah@example.test');
        $student = $this->billableChild($tenant, $parent, 'Ali');
        $invoice = $this->createInvoiceForTenant($tenant, ['final_amount' => 150, 'status' => InvoiceStatus::Issued]);
        $invoice->forceFill(['student_id' => $student->id])->save();

        app(Notifier::class)->billsIssued([$invoice->fresh()]);

        $message = collect(app('mail.manager')->mailer('array')->getSymfonyTransport()->messages())->last();
        $body = $message->getOriginalMessage()->toString();
        $this->assertStringContainsString('Bil baharu', $body);
        $this->assertStringContainsString('has issued a new bill', $body);
        $this->assertStringContainsString('/parent/invoices', $body);
        $this->assertStringContainsString('RM 150.00', $body);
    }

    public function test_the_same_bills_are_never_emailed_twice(): void
    {
        $tenant = $this->createTenant();
        $parent = $this->parentWith($tenant, 'aminah@example.test');
        $student = $this->billableChild($tenant, $parent, 'Ali');
        $invoice = $this->createInvoiceForTenant($tenant, ['final_amount' => 100]);
        $invoice->forceFill(['student_id' => $student->id])->save();

        $notifier = app(Notifier::class);
        $notifier->billsIssued([$invoice->fresh()]);
        $notifier->billsIssued([$invoice->fresh()]);

        $this->assertCount(1, $this->logs('bill_issued'));
    }

    // ---- payments ----

    public function test_recording_a_payment_emails_the_parent_a_receipt(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $parent = $this->parentWith($tenant, 'aminah@example.test');
        $student = $this->billableChild($tenant, $parent, 'Ali');
        $invoice = $this->createInvoiceForTenant($tenant, ['final_amount' => 150, 'status' => InvoiceStatus::Issued]);
        $invoice->forceFill(['student_id' => $student->id])->save();

        $this->actingAs($admin)->postJson("/api/operator/invoices/{$invoice->id}/payments", [
            'method' => 'cash', 'payment_date' => '2026-10-14', 'amount_paid' => 150,
        ])->assertCreated();

        $log = $this->logs('payment_received')->sole();
        $this->assertSame('aminah@example.test', $log->recipient);
        $this->assertStringContainsString('Ali', $log->summary);
        $this->assertSame('sent', $log->status);
    }

    public function test_an_online_checkout_covering_two_bills_sends_one_receipt_and_a_retry_sends_none(): void
    {
        $tenant = $this->createTenant();
        $parent = $this->parentWith($tenant, 'aminah@example.test');
        $a = $this->billableChild($tenant, $parent, 'Ali');
        $b = $this->billableChild($tenant, $parent, 'Siti');
        $invoiceA = $this->createInvoiceForTenant($tenant, ['final_amount' => 100, 'status' => InvoiceStatus::Issued]);
        $invoiceA->forceFill(['student_id' => $a->id])->save();
        $invoiceB = $this->createInvoiceForTenant($tenant, ['final_amount' => 50, 'status' => InvoiceStatus::Issued]);
        $invoiceB->forceFill(['student_id' => $b->id])->save();

        [$parentUser] = $this->createParent($tenant);
        $attempt = PaymentAttempt::create([
            'tenant_id' => $tenant->id, 'user_id' => $parentUser->id, 'billplz_bill_id' => 'bill_1', 'amount' => 150,
        ]);
        $attempt->invoices()->attach([$invoiceA->id => ['amount' => 100], $invoiceB->id => ['amount' => 50]]);

        $settler = app(PaymentAttemptSettler::class);
        $this->assertTrue($settler->settle($attempt));
        $this->assertFalse($settler->settle($attempt->fresh()), 'Billplz retries are no-ops');

        $log = $this->logs('payment_received')->sole();
        $this->assertStringContainsString('Ali', $log->summary);
        $this->assertStringContainsString('Siti', $log->summary);
    }

    // ---- reminders ----

    public function test_reminders_go_out_three_days_before_and_one_day_after_and_never_twice(): void
    {
        $tenant = $this->createTenant();
        $parent = $this->parentWith($tenant, 'aminah@example.test');
        $student = $this->billableChild($tenant, $parent, 'Ali');

        $make = function (string $due, array $overrides = []) use ($tenant, $student) {
            $invoice = $this->createInvoiceForTenant($tenant, ['final_amount' => 100, 'status' => InvoiceStatus::Issued, 'due_date' => $due, ...$overrides]);
            $invoice->forceFill(['student_id' => $student->id])->save();

            return $invoice;
        };

        $make('2026-10-17');                                   // due in 3 days  -> reminder
        $make('2026-10-13');                                   // due yesterday  -> overdue notice
        $make('2026-10-19');                                   // due in 5 days  -> nothing yet
        $make('2026-10-17', ['status' => InvoiceStatus::Paid]); // already paid   -> nothing
        $make('2026-10-10');                                   // overdue for days -> nothing (one notice only)

        $this->artisan('notifications:send-reminders')->assertSuccessful();
        $this->artisan('notifications:send-reminders')->assertSuccessful();

        $this->assertCount(1, $this->logs('reminder_due_soon'));
        $this->assertCount(1, $this->logs('reminder_overdue'));
        $this->assertSame(2, NotificationLog::count());
    }

    public function test_reminders_skip_suspended_operators_and_fully_paid_bills(): void
    {
        $suspended = $this->createTenant(['status' => 'suspended']);
        $parent = $this->parentWith($suspended, 'aminah@example.test');
        $student = $this->billableChild($suspended, $parent, 'Ali');
        $invoice = $this->createInvoiceForTenant($suspended, ['final_amount' => 100, 'status' => InvoiceStatus::Issued, 'due_date' => '2026-10-17']);
        $invoice->forceFill(['student_id' => $student->id])->save();

        $this->artisan('notifications:send-reminders')->assertSuccessful();

        $this->assertSame(0, NotificationLog::count());
    }

    // ---- applications ----

    public function test_a_parent_application_emails_the_operators_owner(): void
    {
        $tenant = $this->createTenant(['company_name' => 'Alpha Buses']);
        $this->createOperatorAdmin($tenant, ['email' => 'boss@alpha.test']);
        [$parentUser] = $this->createParent($tenant);

        $this->actingAs($parentUser)->postJson('/api/parent/student-applications', [
            'full_name' => 'Ali Bin Abu', 'date_of_birth' => '2018-03-04', 'school_name' => 'SK Maju', 'package_type' => 'return',
        ])->assertCreated();

        $log = $this->logs('application_received')->sole();
        $this->assertSame('boss@alpha.test', $log->recipient);
        $this->assertSame('Ali Bin Abu', $log->summary);
    }

    public function test_rejecting_an_application_tells_the_parent_why(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $parent = $this->parentWith($tenant, 'aminah@example.test');
        $application = StudentApplication::factory()->create([
            'tenant_id' => $tenant->id, 'parent_id' => $parent->id, 'status' => 'pending', 'full_name' => 'Ali',
        ]);

        $this->actingAs($admin)->postJson("/api/operator/student-applications/{$application->id}/reject", [
            'rejection_reason' => 'The route is full.',
        ])->assertOk();

        $log = $this->logs('application_decided')->sole();
        $this->assertSame('aminah@example.test', $log->recipient);
        $this->assertStringStartsWith('Rejected', $log->summary);
    }

    // ---- platform ----

    public function test_a_new_operator_signup_emails_the_platform_owners_only(): void
    {
        $this->ensureRole('operator_admin');
        $this->createPlatformUser('owner', ['email' => 'owner@school.test']);
        $this->createPlatformUser('support', ['email' => 'support@school.test']);
        $this->createPlatformUser('owner', ['email' => 'gone@school.test', 'deactivated_at' => now()]);

        $this->fromFrontend()->postJson('/api/register-operator', [
            'company_name' => 'Fresh Buses', 'contact_person' => 'Aminah', 'contact_phone' => '0123456789',
            'email' => 'fresh@buses.test', 'password' => 'password1',
        ])->assertCreated();

        $this->assertSame(['owner@school.test'], $this->logs('operator_signed_up')->pluck('recipient')->all());
    }

    // ---- rules ----

    public function test_a_switched_off_type_is_skipped_and_logged_as_such(): void
    {
        NotificationSetting::create(['type' => 'bill_issued', 'enabled' => false]);
        $tenant = $this->createTenant();
        $parent = $this->parentWith($tenant, 'aminah@example.test');
        $student = $this->billableChild($tenant, $parent, 'Ali');
        $invoice = $this->createInvoiceForTenant($tenant, ['final_amount' => 100]);
        $invoice->forceFill(['student_id' => $student->id])->save();

        app(Notifier::class)->billsIssued([$invoice->fresh()]);

        $log = $this->logs('bill_issued')->sole();
        $this->assertSame('skipped', $log->status);
        $this->assertSame('switched_off', $log->reason);
    }

    public function test_a_parent_with_no_email_is_skipped_not_an_error(): void
    {
        $tenant = $this->createTenant();
        $parent = $this->parentWith($tenant, '');
        $student = $this->billableChild($tenant, $parent, 'Ali');
        $invoice = $this->createInvoiceForTenant($tenant, ['final_amount' => 100]);
        $invoice->forceFill(['student_id' => $student->id])->save();
        $parent->user->forceFill(['email' => 'not-an-email'])->save();

        app(Notifier::class)->billsIssued([$invoice->fresh()]);

        $log = $this->logs('bill_issued')->sole();
        $this->assertSame('skipped', $log->status);
        $this->assertSame('no_email', $log->reason);
    }

    public function test_a_mail_server_failure_never_breaks_recording_the_payment(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $parent = $this->parentWith($tenant, 'aminah@example.test');
        $student = $this->billableChild($tenant, $parent, 'Ali');
        $invoice = $this->createInvoiceForTenant($tenant, ['final_amount' => 150, 'status' => InvoiceStatus::Issued]);
        $invoice->forceFill(['student_id' => $student->id])->save();

        // Nothing listens here, so the connection is refused straight away.
        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp' => ['transport' => 'smtp', 'host' => '127.0.0.1', 'port' => 1, 'timeout' => 2],
        ]);

        $this->actingAs($admin)->postJson("/api/operator/invoices/{$invoice->id}/payments", [
            'method' => 'cash', 'payment_date' => '2026-10-14', 'amount_paid' => 150,
        ])->assertCreated();

        $this->assertSame('paid', $invoice->fresh()->status->value);
        $log = $this->logs('payment_received')->sole();
        $this->assertSame('failed', $log->status);
        $this->assertNotNull($log->reason);
    }

    // ---- daytime window ----

    public function test_parent_emails_wait_for_the_morning(): void
    {
        $notifier = app(Notifier::class);
        $kl = fn (string $time) => Carbon::parse("2026-10-14 {$time}", 'Asia/Kuala_Lumpur');

        $this->assertNull($notifier->nextDaytime($kl('09:00:00')));
        $this->assertNull($notifier->nextDaytime($kl('19:59:00')));

        $beforeDawn = $notifier->nextDaytime($kl('03:00:00'));
        $this->assertSame('2026-10-14 09:00', $beforeDawn->setTimezone('Asia/Kuala_Lumpur')->format('Y-m-d H:i'));

        $night = $notifier->nextDaytime($kl('21:30:00'));
        $this->assertSame('2026-10-15 09:00', $night->setTimezone('Asia/Kuala_Lumpur')->format('Y-m-d H:i'));
    }
}
