<?php

namespace Tests\Feature\Admin;

use App\Models\BusOperator;
use App\Models\ParentProfile;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class ParentReportTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo(Carbon::parse('2026-10-14 12:00:00'));
    }

    /** @return list<ParentProfile> */
    private function parents(BusOperator $tenant, int $count, array $profile = []): array
    {
        $made = [];
        for ($i = 0; $i < $count; $i++) {
            [, $made[]] = $this->createParent($tenant, [], $profile);
        }

        return $made;
    }

    /** One distribution as [key => count] (null = withheld because the group was too small). */
    private function report(array $query = []): array
    {
        $owner = $this->createPlatformUser('owner');
        $response = $this->actingAs($owner)->getJson('/api/admin/reports/parents?'.http_build_query($query));
        $response->assertOk();

        return $response->json();
    }

    private function items(array $report, string $distribution): array
    {
        return collect($report['distributions'][$distribution]['items'])->pluck('count', 'key')->all();
    }

    public function test_only_the_owner_can_read_the_report(): void
    {
        $this->parents($this->createTenant(), 5);

        foreach (['finance', 'support'] as $level) {
            $this->actingAs($this->createPlatformUser($level))->getJson('/api/admin/reports/parents')->assertForbidden();
        }
        $operator = $this->createOperatorAdmin($this->createTenant());
        $this->actingAs($operator)->getJson('/api/admin/reports/parents')->assertForbidden();

        $this->actingAs($this->createPlatformUser('owner'))->getJson('/api/admin/reports/parents')->assertOk();
    }

    public function test_it_says_there_is_not_enough_data_instead_of_describing_a_handful_of_people(): void
    {
        $this->parents($this->createTenant(), 4, ['gender' => 'female']);

        $report = $this->report();

        $this->assertFalse($report['enough_data']);
        $this->assertSame(4, $report['total_parents']);
        $this->assertEmpty($report['distributions']);
    }

    public function test_totals_and_the_share_who_answered_the_about_you_form(): void
    {
        $tenant = $this->createTenant();
        $this->parents($tenant, 6, ['about_saved_at' => now()]);
        $this->parents($tenant, 4);

        $report = $this->report();

        $this->assertSame(10, $report['total_parents']);
        $this->assertSame(6, $report['answered_about']);
        $this->assertTrue($report['enough_data']);
    }

    public function test_groups_under_five_are_folded_into_other_and_a_tiny_other_is_withheld(): void
    {
        $tenant = $this->createTenant();
        $this->parents($tenant, 6, ['gender' => 'female']);
        $this->parents($tenant, 5, ['gender' => 'male']);
        // Two parents who never said: too few to show, and "other" is too small to show a number.
        $this->parents($tenant, 2, ['gender' => null]);

        $gender = $this->items($this->report(), 'gender');

        $this->assertSame(6, $gender['female']);
        $this->assertSame(5, $gender['male']);
        $this->assertArrayHasKey('other', $gender);
        $this->assertNull($gender['other'], 'a count of 2 must not be shown');
        $this->assertArrayNotHasKey('unknown', $gender);
    }

    public function test_several_small_groups_that_add_up_to_five_or_more_are_shown_together_as_other(): void
    {
        $tenant = $this->createTenant();
        $this->parents($tenant, 6, ['relationship' => 'mother']);
        $this->parents($tenant, 3, ['relationship' => 'father']);
        $this->parents($tenant, 3, ['relationship' => 'guardian']);

        $relationship = $this->items($this->report(), 'relationship');

        $this->assertSame(['mother' => 6, 'other' => 6], $relationship);
    }

    public function test_parents_are_placed_in_age_bands_from_their_ic_number(): void
    {
        $tenant = $this->createTenant();
        $this->parents($tenant, 5, ['ic_number' => '900101-10-1234']); // born 1990 -> 36
        $this->parents($tenant, 5, ['ic_number' => '780630-14-5678']); // born 1978 -> 48
        $this->parents($tenant, 5, ['ic_number' => 'not a number']);    // no date in it

        $age = $this->items($this->report(), 'age');

        $this->assertSame(['35_44' => 5, '45_54' => 5, 'unknown' => 5], $age);
    }

    public function test_a_two_digit_year_after_this_year_means_the_1900s(): void
    {
        $tenant = $this->createTenant();
        // 26 is this year, so 27 can only be 1927 (99 years old), which we treat as implausible-but-valid;
        // 26 itself is 2026 and an adult cannot be born this year -> age 0 -> under 25.
        $this->parents($tenant, 5, ['ic_number' => '261001-10-1234']);
        $this->parents($tenant, 5, ['ic_number' => '960101-10-1234']);  // 1996 -> 30

        $age = $this->items($this->report(), 'age');

        $this->assertSame(5, $age['under_25']);
        $this->assertSame(5, $age['25_34']);
    }

    public function test_the_state_comes_from_the_postcode(): void
    {
        $tenant = $this->createTenant();
        $this->parents($tenant, 5, ['postcode' => '50450']); // Kuala Lumpur
        $this->parents($tenant, 6, ['postcode' => '40000']); // Selangor
        $this->parents($tenant, 5, ['postcode' => null]);

        $state = $this->items($this->report(), 'state');

        $this->assertSame(['Selangor' => 6, 'Kuala Lumpur' => 5, 'unknown' => 5], $state);
    }

    public function test_children_per_family_and_school_level_count_enrolled_children_only(): void
    {
        $tenant = $this->createTenant();
        $oneChild = $this->parents($tenant, 5);
        $twoChildren = $this->parents($tenant, 5);

        $kid = fn (ParentProfile $parent, string $dob, string $status = 'active') => Student::factory()->create([
            'tenant_id' => $tenant->id, 'parent_id' => $parent->id,
            'date_of_birth' => $dob, 'enrollment_status' => $status,
        ]);

        foreach ($oneChild as $parent) {
            $kid($parent, '2019-05-05');                  // 7 -> Year 1
            $kid($parent, '2010-01-01', 'withdrawn');     // not counted
        }
        foreach ($twoChildren as $parent) {
            $kid($parent, '2019-03-03');                  // Year 1
            $kid($parent, '2014-03-03');                  // 12 -> Year 6
        }

        $report = $this->report();

        $this->assertSame(['1' => 5, '2' => 5], $this->items($report, 'children'));
        $this->assertSame(['year_1' => 10, 'year_6' => 5], $this->items($report, 'school_level'));
    }

    public function test_income_and_working_field_include_those_who_did_not_answer(): void
    {
        $tenant = $this->createTenant();
        $this->parents($tenant, 5, ['income_range' => '3000_5000', 'working_field' => 'education']);
        $this->parents($tenant, 6, ['income_range' => null, 'working_field' => null]);

        $report = $this->report();

        $this->assertSame(['3000_5000' => 5, 'not_answered' => 6], $this->items($report, 'income'));
        $this->assertSame(['education' => 5, 'not_answered' => 6], $this->items($report, 'working_field'));
    }

    public function test_professions_are_tidied_and_only_shown_when_five_or_more_share_one(): void
    {
        $tenant = $this->createTenant();
        foreach (['teacher', 'Teacher', ' TEACHER ', 'teacher', 'Teacher  '] as $title) {
            $this->parents($tenant, 1, ['occupation' => $title]);
        }
        foreach (range(1, 5) as $_) {
            $this->parents($tenant, 1, ['occupation' => 'LAWYER of the moon']);
        }
        $this->parents($tenant, 1, ['occupation' => 'Astronaut']);
        $this->parents($tenant, 1, ['occupation' => 'Lighthouse keeper']);

        $report = $this->report();
        $profession = $report['distributions']['profession'];

        $this->assertSame(
            [['key' => 'Teacher', 'count' => 5], ['key' => 'Lawyer of the moon', 'count' => 5]],
            $profession['items'],
        );
        $this->assertSame(2, $profession['hidden_titles']);
        $this->assertStringNotContainsString('Astronaut', json_encode($report));
        $this->assertStringNotContainsString('Lighthouse', json_encode($report));
    }

    public function test_it_can_be_narrowed_to_one_operator(): void
    {
        $alpha = $this->createTenant(['company_name' => 'Alpha']);
        $beta = $this->createTenant(['company_name' => 'Beta']);
        $this->parents($alpha, 5, ['gender' => 'female']);
        $this->parents($beta, 7, ['gender' => 'male']);

        $all = $this->report();
        $onlyBeta = $this->report(['operator_id' => $beta->id]);

        $this->assertSame(12, $all['total_parents']);
        $this->assertSame(7, $onlyBeta['total_parents']);
        $this->assertSame(['male' => 7], $this->items($onlyBeta, 'gender'));
    }

    public function test_nothing_that_identifies_a_parent_is_ever_in_the_response(): void
    {
        $tenant = $this->createTenant();
        $secret = $this->parents($tenant, 6, [
            'full_name' => 'Zainab Binti Secret',
            'email' => 'zainab.secret@example.test',
            'phone' => '019-8887766',
            'ic_number' => '900101-10-9999',
            'address_line1' => '99 Secret Lane',
            'occupation' => 'Teacher',
            'income_range' => '3000_5000',
        ]);

        $body = json_encode($this->report());

        foreach (['Zainab', 'Secret', 'zainab.secret', '019-8887766', '900101-10-9999', 'Lane'] as $needle) {
            $this->assertStringNotContainsString($needle, $body, "leaked: {$needle}");
        }
        $this->assertCount(6, $secret);
    }
}
