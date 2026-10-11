<?php

namespace Tests\Unit;

use App\Support\AgeFromIc;
use App\Support\MalaysianPostcode;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class MalaysianPostcodeTest extends TestCase
{
    #[DataProvider('known')]
    public function test_known_postcodes_map_to_their_state(string $postcode, string $state): void
    {
        $this->assertSame($state, MalaysianPostcode::state($postcode));
    }

    public static function known(): array
    {
        return [
            'KLCC' => ['50088', 'Kuala Lumpur'],
            'Bangsar' => ['59100', 'Kuala Lumpur'],
            'Shah Alam' => ['40000', 'Selangor'],
            'Petaling Jaya' => ['47810', 'Selangor'],
            'Cyberjaya' => ['63000', 'Selangor'],
            'Putrajaya' => ['62000', 'Putrajaya'],
            'George Town' => ['10200', 'Pulau Pinang'],
            'Johor Bahru' => ['80000', 'Johor'],
            'Ipoh' => ['30000', 'Perak'],
            'Alor Setar' => ['05000', 'Kedah'],
            'Kota Bharu' => ['15000', 'Kelantan'],
            'Kuala Terengganu' => ['20000', 'Terengganu'],
            'Kuantan' => ['25000', 'Pahang'],
            'Seremban' => ['70000', 'Negeri Sembilan'],
            'Melaka' => ['75000', 'Melaka'],
            'Kota Kinabalu' => ['88000', 'Sabah'],
            'Kuching' => ['93000', 'Sarawak'],
            'Kangar' => ['01000', 'Perlis'],
            'Labuan' => ['87000', 'Labuan'],
            'with a space' => ['50 450', 'Kuala Lumpur'],
        ];
    }

    public function test_anything_that_is_not_a_five_digit_postcode_is_unknown(): void
    {
        foreach ([null, '', '5045', '504500', 'ABCDE', '00000', '19999', '99999'] as $bad) {
            $this->assertNull(MalaysianPostcode::state($bad), (string) $bad);
        }
    }

    public function test_age_comes_from_the_date_at_the_start_of_the_ic(): void
    {
        $today = Carbon::parse('2026-10-14');

        $this->assertSame(36, AgeFromIc::years('900101-10-1234', $today));
        $this->assertSame(35, AgeFromIc::years('901231-10-1234', $today));  // birthday not yet this year
        $this->assertSame(48, AgeFromIc::years('780630145678', $today));    // no dashes
        $this->assertNull(AgeFromIc::years('991399-10-1234', $today));      // month 13
        $this->assertNull(AgeFromIc::years('900230-10-1234', $today));      // 30 February
        $this->assertNull(AgeFromIc::years('12', $today));
        $this->assertNull(AgeFromIc::years(null, $today));
    }
}
