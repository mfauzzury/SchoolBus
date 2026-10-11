<?php

namespace App\Support;

use Illuminate\Support\Carbon;

/**
 * A Malaysian IC number starts with the date of birth (YYMMDD). Used only to
 * place a parent in an age band for totals; the number itself is never returned.
 */
class AgeFromIc
{
    public static function years(?string $ic, ?Carbon $today = null): ?int
    {
        $today ??= now();
        $digits = preg_replace('/\D+/', '', (string) $ic) ?? '';

        if (strlen($digits) < 6) {
            return null;
        }

        $yy = (int) substr($digits, 0, 2);
        $month = (int) substr($digits, 2, 2);
        $day = (int) substr($digits, 4, 2);

        if (! checkdate($month, $day, 2000)) {
            return null;
        }

        // A parent born in the 2000s is possible but a parent born in 2090 is not:
        // two-digit years later than this year's belong to the 1900s.
        $year = $yy > (int) $today->format('y') ? 1900 + $yy : 2000 + $yy;

        if (! checkdate($month, $day, $year)) {
            return null;
        }

        $age = Carbon::create($year, $month, $day)->diffInYears($today);

        return $age >= 0 && $age <= 110 ? (int) $age : null;
    }
}
