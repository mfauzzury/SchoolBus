<?php

namespace App\Enums;

/**
 * The parts of a child's day a transit center can ask the bus to cover. They
 * only say which trips run (the child's route flow); the price is one monthly
 * price per center.
 */
enum TransitLeg: string
{
    // After school (afternoon / drop-off trips).
    case SchoolToCenter = 'school_to_center';
    case CenterToHome = 'center_to_home';

    // Before school (morning / pickup trips), for afternoon-session children.
    case HomeToCenter = 'home_to_center';
    case CenterToSchool = 'center_to_school';

    /** Which trip of the day carries this leg (matches trips.direction). */
    public function direction(): string
    {
        return match ($this) {
            self::SchoolToCenter, self::CenterToHome => 'dropoff',
            self::HomeToCenter, self::CenterToSchool => 'pickup',
        };
    }

    /** Whether the child's home stop on the bus has to be chosen for this part. */
    public function needsHomeStop(): bool
    {
        return $this === self::CenterToHome || $this === self::HomeToCenter;
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $leg) => $leg->value, self::cases());
    }
}
