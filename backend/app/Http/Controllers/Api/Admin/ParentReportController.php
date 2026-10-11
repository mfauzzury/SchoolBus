<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ParentProfile;
use App\Models\Student;
use App\Support\AgeFromIc;
use App\Support\MalaysianPostcode;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * "Who are our parents?" as group totals only. No names, emails, phone or IC
 * numbers ever leave this class, and any group smaller than MIN_GROUP is
 * folded into "other" (shown as hidden if even that is too small), which is
 * what parents were told when they answered the optional questions.
 */
class ParentReportController extends Controller
{
    public const MIN_GROUP = 5;

    private const AGE_BANDS = ['under_25', '25_34', '35_44', '45_54', '55_plus'];

    public function show(Request $request)
    {
        $request->validate(['operator_id' => 'nullable|integer']);

        $parents = ParentProfile::query()
            ->when($request->filled('operator_id'), fn ($q) => $q->where('tenant_id', $request->integer('operator_id')))
            ->get(['id', 'tenant_id', 'ic_number', 'gender', 'relationship', 'postcode',
                'income_range', 'occupation', 'working_field', 'about_saved_at']);

        // Private answers are hidden on the model by default; this report reads them for counting only.
        $parents->each->makeVisible(ParentProfile::PRIVATE_FIELDS);

        $ids = $parents->pluck('id');
        $childDates = Student::query()
            ->whereIn('parent_id', $ids)
            ->where('enrollment_status', 'active')
            ->get(['parent_id', 'date_of_birth'])
            ->groupBy('parent_id');

        $today = now();
        $thisYear = (int) $today->format('Y');

        $total = $parents->count();

        return [
            'min_group' => self::MIN_GROUP,
            'total_parents' => $total,
            'answered_about' => $parents->whereNotNull('about_saved_at')->count(),
            // Too few to describe anyone without pointing at them.
            'enough_data' => $total >= self::MIN_GROUP,
            'distributions' => $total < self::MIN_GROUP ? (object) [] : [
                'gender' => $this->distribution(
                    $this->count($parents, fn ($p) => $p->gender ?? 'unknown'),
                    ['male', 'female', 'unknown'],
                ),
                'relationship' => $this->distribution(
                    $this->count($parents, fn ($p) => $p->relationship ?? 'unknown'),
                    ['father', 'mother', 'guardian', 'unknown'],
                ),
                'age' => $this->distribution(
                    $this->count($parents, fn ($p) => $this->ageBand(AgeFromIc::years($p->ic_number, $today))),
                    [...self::AGE_BANDS, 'unknown'],
                ),
                'state' => $this->distribution(
                    $this->count($parents, fn ($p) => MalaysianPostcode::state($p->postcode) ?? 'unknown'),
                ),
                'children' => $this->distribution(
                    $this->count($parents, function ($p) use ($childDates) {
                        $n = count($childDates[$p->id] ?? []);

                        return $n >= 4 ? '4_plus' : (string) $n;
                    }),
                    ['0', '1', '2', '3', '4_plus'],
                ),
                'school_level' => $this->distribution(
                    $this->schoolLevels($childDates, $thisYear),
                    ['preschool', 'year_1', 'year_2', 'year_3', 'year_4', 'year_5', 'year_6',
                        'form_1', 'form_2', 'form_3', 'form_4', 'form_5', 'other'],
                ),
                'income' => $this->distribution(
                    $this->count($parents, fn ($p) => $p->income_range ?? 'not_answered'),
                    [...ParentProfile::INCOME_RANGES, 'not_answered'],
                ),
                'working_field' => $this->distribution(
                    $this->count($parents, fn ($p) => $p->working_field ?? 'not_answered'),
                    [...ParentProfile::WORKING_FIELDS, 'not_answered'],
                ),
                'profession' => $this->professions($parents),
            ],
        ];
    }

    /** @param  callable(ParentProfile): string  $bucket */
    private function count($parents, callable $bucket): array
    {
        $counts = [];

        foreach ($parents as $parent) {
            $key = $bucket($parent);
            $counts[$key] = ($counts[$key] ?? 0) + 1;
        }

        return $counts;
    }

    /**
     * Turns raw counts into what may be shown: groups under MIN_GROUP are folded
     * into "other", and if "other" is itself too small its number is withheld (null).
     *
     * @param  array<string, int>  $counts
     * @param  list<string>  $order  preferred order; anything else follows, biggest first
     * @return array{base: int, items: list<array{key: string, count: int|null}>}
     */
    private function distribution(array $counts, array $order = []): array
    {
        $base = array_sum($counts);
        $visible = [];
        $pool = 0;

        foreach ($counts as $key => $n) {
            if ($n >= self::MIN_GROUP) {
                $visible[$key] = $n;
            } elseif ($n > 0) {
                $pool += $n;
            }
        }

        $ordered = [];
        foreach ($order as $key) {
            if (isset($visible[$key])) {
                $ordered[$key] = $visible[$key];
                unset($visible[$key]);
            }
        }
        arsort($visible);
        $ordered += $visible;

        $items = [];
        foreach ($ordered as $key => $n) {
            $items[] = ['key' => (string) $key, 'count' => $n];
        }

        if ($pool > 0) {
            $items[] = ['key' => 'other', 'count' => $pool >= self::MIN_GROUP ? $pool : null];
        }

        return ['base' => $base, 'items' => $items];
    }

    private function ageBand(?int $age): string
    {
        return match (true) {
            $age === null => 'unknown',
            $age < 25 => 'under_25',
            $age < 35 => '25_34',
            $age < 45 => '35_44',
            $age < 55 => '45_54',
            default => '55_plus',
        };
    }

    /** School level of every enrolled child, by year of birth (the same rule the apps use). */
    private function schoolLevels($childDates, int $thisYear): array
    {
        $counts = [];

        foreach ($childDates as $children) {
            foreach ($children as $child) {
                $age = $thisYear - Carbon::parse($child->date_of_birth)->year;

                $level = match (true) {
                    $age < 7 => 'preschool',
                    $age <= 12 => 'year_'.($age - 6),
                    $age <= 17 => 'form_'.($age - 12),
                    default => 'other',
                };

                $counts[$level] = ($counts[$level] ?? 0) + 1;
            }
        }

        return $counts;
    }

    /** Most common job titles, free text, tidied; a title only shows once 5 or more parents share it. */
    private function professions($parents): array
    {
        $counts = [];

        foreach ($parents as $parent) {
            $title = mb_strtolower(trim((string) preg_replace('/\s+/', ' ', (string) $parent->occupation)));

            if ($title !== '') {
                $counts[$title] = ($counts[$title] ?? 0) + 1;
            }
        }

        $shown = array_filter($counts, fn ($n) => $n >= self::MIN_GROUP);
        arsort($shown);
        $shown = array_slice($shown, 0, 10, true);

        $items = [];
        foreach ($shown as $title => $n) {
            // "teacher" -> "Teacher", "lawyer of the moon" -> "Lawyer of the moon" (not Title Case).
            $items[] = ['key' => mb_strtoupper(mb_substr($title, 0, 1)).mb_substr($title, 1), 'count' => $n];
        }

        return [
            'base' => array_sum($counts),
            'items' => $items,
            // How many answers were left out because too few parents share them.
            'hidden_titles' => count($counts) - count($items),
        ];
    }
}
