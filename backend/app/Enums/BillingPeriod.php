<?php

namespace App\Enums;

enum BillingPeriod: string
{
    case Monthly = 'monthly';
    case Quarterly = 'quarterly';
    case HalfYear = 'half_year';
    case Yearly = 'yearly';

    public function months(): int
    {
        return match ($this) {
            self::Monthly => 1,
            self::Quarterly => 3,
            self::HalfYear => 6,
            self::Yearly => 12,
        };
    }
}
