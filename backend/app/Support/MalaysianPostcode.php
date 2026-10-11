<?php

namespace App\Support;

/**
 * Which state a Malaysian postcode is in, from its first two digits. Good
 * enough for "where do our parents live" totals; a postcode that does not
 * match any range simply counts as unknown.
 */
class MalaysianPostcode
{
    /** @var list<array{0: int, 1: int, 2: string}> inclusive two-digit prefix ranges */
    private const RANGES = [
        [1, 2, 'Perlis'],
        [5, 9, 'Kedah'],
        [10, 14, 'Pulau Pinang'],
        [15, 18, 'Kelantan'],
        [20, 24, 'Terengganu'],
        [25, 28, 'Pahang'],
        [30, 36, 'Perak'],
        [39, 39, 'Pahang'],       // Cameron Highlands
        [40, 48, 'Selangor'],
        [49, 49, 'Pahang'],       // Genting Highlands
        [50, 60, 'Kuala Lumpur'],
        [62, 62, 'Putrajaya'],
        [63, 63, 'Selangor'],     // Cyberjaya
        [68, 68, 'Selangor'],     // Gombak, Batu Caves
        [70, 73, 'Negeri Sembilan'],
        [75, 78, 'Melaka'],
        [79, 86, 'Johor'],
        [87, 87, 'Labuan'],
        [88, 91, 'Sabah'],
        [93, 98, 'Sarawak'],
    ];

    public static function state(?string $postcode): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $postcode) ?? '';

        if (strlen($digits) !== 5) {
            return null;
        }

        $prefix = (int) substr($digits, 0, 2);

        foreach (self::RANGES as [$from, $to, $state]) {
            if ($prefix >= $from && $prefix <= $to) {
                return $state;
            }
        }

        return null;
    }
}
