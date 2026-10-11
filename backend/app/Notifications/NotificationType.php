<?php

namespace App\Notifications;

/**
 * Every kind of message the platform sends on its own. `parent` ones go to
 * parents and are only sent in daytime hours; the rest go to the operator's
 * team or the platform team straight away.
 */
final class NotificationType
{
    public const BILL_ISSUED = 'bill_issued';

    public const PAYMENT_RECEIVED = 'payment_received';

    public const REMINDER_DUE_SOON = 'reminder_due_soon';

    public const REMINDER_OVERDUE = 'reminder_overdue';

    public const APPLICATION_DECIDED = 'application_decided';

    public const APPLICATION_RECEIVED = 'application_received';

    public const OPERATOR_SIGNED_UP = 'operator_signed_up';

    /** @return array<string, array{audience: string, daytime_only: bool}> */
    public static function all(): array
    {
        return [
            self::BILL_ISSUED => ['audience' => 'parent', 'daytime_only' => true],
            self::PAYMENT_RECEIVED => ['audience' => 'parent', 'daytime_only' => true],
            self::REMINDER_DUE_SOON => ['audience' => 'parent', 'daytime_only' => true],
            self::REMINDER_OVERDUE => ['audience' => 'parent', 'daytime_only' => true],
            self::APPLICATION_DECIDED => ['audience' => 'parent', 'daytime_only' => true],
            self::APPLICATION_RECEIVED => ['audience' => 'operator', 'daytime_only' => false],
            self::OPERATOR_SIGNED_UP => ['audience' => 'platform', 'daytime_only' => false],
        ];
    }

    public static function exists(string $type): bool
    {
        return array_key_exists($type, self::all());
    }
}
