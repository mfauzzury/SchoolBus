<?php

namespace App\Services;

use App\Models\BusOperator;
use App\Models\Invoice;
use App\Models\NotificationLog;
use App\Models\NotificationSetting;
use App\Models\ParentProfile;
use App\Models\Payment;
use App\Models\StudentApplication;
use App\Models\User;
use App\Notifications\ApplicationDecided;
use App\Notifications\ApplicationReceived;
use App\Notifications\BillsIssued;
use App\Notifications\NotificationType;
use App\Notifications\OperatorSignedUp;
use App\Notifications\PaymentReceived;
use App\Notifications\PaymentReminder;
use App\Notifications\PlatformNotification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Throwable;

/**
 * The one door every automatic message goes through. It decides whether to
 * send (switched on? has an address? already sent?), writes the log row, and
 * hands the email to the queue. It never throws: a mail problem must not break
 * recording a payment or issuing a bill.
 */
class Notifier
{
    /** Parents are only emailed between these local hours. */
    private const DAYTIME_FROM = 9;

    private const DAYTIME_TO = 20;

    // ---- events ----

    /**
     * New bills, one email per parent however many children were billed.
     *
     * @param  iterable<Invoice>  $invoices
     */
    public function billsIssued(iterable $invoices): void
    {
        $this->guard(function () use ($invoices) {
            $byParent = collect($invoices)
                ->each(fn (Invoice $invoice) => $invoice->loadMissing(['student.parentProfile.user', 'busOperator']))
                ->filter(fn (Invoice $invoice) => $invoice->student?->parentProfile)
                ->groupBy(fn (Invoice $invoice) => $invoice->student->parent_id);

            foreach ($byParent as $group) {
                $parent = $group->first()->student->parentProfile;
                $operator = $group->first()->busOperator;
                $lines = $group->map(fn (Invoice $i) => [
                    'student' => $i->student->full_name,
                    'amount' => (string) $i->final_amount,
                    'due_date' => $i->due_date->toDateString(),
                ])->values()->all();

                $this->send(
                    NotificationType::BILL_ISSUED,
                    $this->parentEmail($parent),
                    $parent->full_name,
                    new BillsIssued($operator->company_name, $parent->full_name, $lines),
                    $this->summary($lines),
                    $operator->id,
                    'bill_issued:'.$group->pluck('id')->sort()->implode(','),
                );
            }
        });
    }

    /**
     * A payment (or one online checkout covering several bills) was received.
     *
     * @param  iterable<Payment>  $payments
     */
    public function paymentReceived(iterable $payments): void
    {
        $this->guard(function () use ($payments) {
            $byParent = collect($payments)
                ->each(fn (Payment $payment) => $payment->loadMissing(['invoice.student.parentProfile.user', 'invoice.busOperator']))
                ->filter(fn (Payment $payment) => $payment->invoice?->student?->parentProfile)
                ->groupBy(fn (Payment $payment) => $payment->invoice->student->parent_id);

            foreach ($byParent as $group) {
                $parent = $group->first()->invoice->student->parentProfile;
                $operator = $group->first()->invoice->busOperator;
                $lines = $group->map(fn (Payment $p) => [
                    'student' => $p->invoice->student->full_name,
                    'amount' => (string) $p->amount_paid,
                ])->values()->all();

                $this->send(
                    NotificationType::PAYMENT_RECEIVED,
                    $this->parentEmail($parent),
                    $parent->full_name,
                    new PaymentReceived(
                        $operator->company_name,
                        $parent->full_name,
                        $lines,
                        $group->first()->payment_date->toDateString(),
                    ),
                    $this->summary($lines),
                    $operator->id,
                    'payment_received:'.$group->pluck('id')->sort()->implode(','),
                );
            }
        });
    }

    /**
     * Reminders for bills that are due soon or overdue, one email per parent.
     * Re-running the job the same day sends nothing twice.
     *
     * @param  'due_soon'|'overdue'  $kind
     * @param  iterable<Invoice>  $invoices
     */
    public function reminders(string $kind, iterable $invoices): void
    {
        $this->guard(function () use ($kind, $invoices) {
            $type = $kind === PaymentReminder::OVERDUE
                ? NotificationType::REMINDER_OVERDUE
                : NotificationType::REMINDER_DUE_SOON;

            $byParent = collect($invoices)
                ->each(fn (Invoice $invoice) => $invoice->loadMissing(['student.parentProfile.user', 'busOperator']))
                ->filter(fn (Invoice $invoice) => $invoice->student?->parentProfile)
                ->groupBy(fn (Invoice $invoice) => $invoice->student->parent_id);

            foreach ($byParent as $group) {
                $parent = $group->first()->student->parentProfile;
                $operator = $group->first()->busOperator;
                $lines = $group->map(fn (Invoice $i) => [
                    'student' => $i->student->full_name,
                    'amount' => (string) $i->balance(),
                    'due_date' => $i->due_date->toDateString(),
                ])->values()->all();

                $this->send(
                    $type,
                    $this->parentEmail($parent),
                    $parent->full_name,
                    new PaymentReminder($kind, $operator->company_name, $parent->full_name, $lines),
                    $this->summary($lines),
                    $operator->id,
                    "{$type}:".$group->pluck('id')->sort()->implode(','),
                );
            }
        });
    }

    public function applicationDecided(StudentApplication $application, bool $approved): void
    {
        $this->guard(function () use ($application, $approved) {
            $application->loadMissing(['parentProfile.user', 'busOperator']);
            $parent = $application->parentProfile;

            if (! $parent) {
                return;
            }

            $this->send(
                NotificationType::APPLICATION_DECIDED,
                $this->parentEmail($parent),
                $parent->full_name,
                new ApplicationDecided(
                    $approved,
                    $application->busOperator->company_name,
                    $parent->full_name,
                    $application->full_name,
                    $approved ? null : $application->rejection_reason,
                ),
                ($approved ? 'Approved: ' : 'Rejected: ').$application->full_name,
                $application->tenant_id,
                "application_decided:{$application->id}",
            );
        });
    }

    public function applicationReceived(StudentApplication $application): void
    {
        $this->guard(function () use ($application) {
            $application->loadMissing(['parentProfile', 'busOperator']);
            $operator = $application->busOperator;

            $emails = $operator->users()->operatorOwners()->pluck('email')->filter()->unique();
            if ($emails->isEmpty() && filled($operator->email)) {
                $emails = collect([$operator->email]);
            }

            foreach ($emails as $email) {
                $this->send(
                    NotificationType::APPLICATION_RECEIVED,
                    $email,
                    $operator->company_name,
                    new ApplicationReceived(
                        $operator->company_name,
                        $application->parentProfile?->full_name ?? '—',
                        $application->full_name,
                    ),
                    $application->full_name,
                    $operator->id,
                    "application_received:{$application->id}:{$email}",
                );
            }
        });
    }

    /** Tells every active platform Owner. */
    public function operatorSignedUp(BusOperator $operator): void
    {
        $this->guard(function () use ($operator) {
            $owners = User::query()->platformOwners()->whereNull('deactivated_at')->get(['email', 'name']);

            foreach ($owners as $owner) {
                $this->send(
                    NotificationType::OPERATOR_SIGNED_UP,
                    $owner->email,
                    $owner->name,
                    new OperatorSignedUp(
                        $operator->id,
                        $operator->company_name,
                        $operator->contact_person,
                        $operator->contact_phone,
                        $operator->email,
                    ),
                    $operator->company_name,
                    $operator->id,
                    "operator_signed_up:{$operator->id}:{$owner->email}",
                );
            }
        });
    }

    // ---- core ----

    public function send(
        string $type,
        ?string $email,
        ?string $name,
        PlatformNotification $notification,
        string $summary,
        ?int $tenantId = null,
        ?string $dedupeKey = null,
    ): ?NotificationLog {
        $existing = $dedupeKey ? NotificationLog::firstWhere('dedupe_key', $dedupeKey) : null;

        // Already made (sent, waiting, or deliberately skipped): never twice. A failed one may be retried.
        if ($existing && $existing->status !== NotificationLog::FAILED) {
            return $existing;
        }

        $attributes = [
            'tenant_id' => $tenantId,
            'type' => $type,
            'channel' => 'mail',
            'recipient' => (string) $email,
            'recipient_name' => $name,
            'subject' => $notification->subjectLine(),
            'summary' => Str::limit($summary, 250, ''),
            'dedupe_key' => $dedupeKey,
            'notification_id' => null,
            'transport' => null,
            'sent_at' => null,
        ];

        if (! NotificationSetting::isEnabled($type)) {
            return $this->record($existing, $attributes + ['status' => NotificationLog::SKIPPED, 'reason' => 'switched_off']);
        }

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->record($existing, $attributes + ['status' => NotificationLog::SKIPPED, 'reason' => 'no_email']);
        }

        $log = $this->record($existing, [
            ...$attributes,
            'status' => NotificationLog::QUEUED,
            'reason' => null,
            'notification_id' => (string) Str::uuid(),
        ]);

        $notification->id = $log->notification_id;

        if (NotificationType::all()[$type]['daytime_only'] && ($at = $this->nextDaytime())) {
            $notification->delay($at);
        }

        try {
            Notification::route('mail', [$email => $name])->notify($notification);
        } catch (Throwable $e) {
            // Only reachable when the queue runs inline; with a real queue the worker reports failures.
            NotificationLog::markFailed($log->notification_id, $e);
        }

        return $log->fresh();
    }

    /** When to send a daytime-only message: null = now, otherwise the next 9am (Malaysia time). */
    public function nextDaytime(?Carbon $now = null): ?Carbon
    {
        $local = ($now ?? now())->copy()->setTimezone(config('app.billing_timezone'));

        if ($local->hour >= self::DAYTIME_FROM && $local->hour < self::DAYTIME_TO) {
            return null;
        }

        $nineAm = $local->copy()->setTime(self::DAYTIME_FROM, 0);

        return ($local->hour >= self::DAYTIME_TO ? $nineAm->addDay() : $nineAm)->setTimezone(config('app.timezone'));
    }

    // ---- helpers ----

    private function record(?NotificationLog $existing, array $attributes): NotificationLog
    {
        if ($existing) {
            $existing->update($attributes);

            return $existing;
        }

        return NotificationLog::create($attributes);
    }

    private function parentEmail(ParentProfile $parent): ?string
    {
        return $parent->email ?: $parent->user?->email;
    }

    /** @param  list<array{student: string, amount: string}>  $lines */
    private function summary(array $lines): string
    {
        return collect($lines)
            ->map(fn ($l) => $l['student'].' - RM '.number_format((float) $l['amount'], 2))
            ->implode('; ');
    }

    /** Messaging is a side effect: whatever goes wrong here, the main action still succeeds. */
    private function guard(callable $callback): void
    {
        try {
            $callback();
        } catch (Throwable $e) {
            report($e);
        }
    }
}
