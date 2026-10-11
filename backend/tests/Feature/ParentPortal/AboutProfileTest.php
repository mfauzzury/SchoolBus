<?php

namespace Tests\Feature\ParentPortal;

use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class AboutProfileTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private function answers(array $overrides = []): array
    {
        return [
            'income_range' => '5000_8000',
            'occupation' => 'Primary school teacher',
            'working_field' => 'education',
            ...$overrides,
        ];
    }

    public function test_a_parent_saves_their_answers_and_sees_them_again(): void
    {
        [$user, $profile] = $this->createParent($this->createTenant());

        $this->actingAs($user)->putJson('/api/parent/profile/about', $this->answers())
            ->assertOk()
            ->assertJsonPath('income_range', '5000_8000')
            ->assertJsonPath('occupation', 'Primary school teacher')
            ->assertJsonPath('working_field', 'education');

        $fresh = $profile->fresh();
        $this->assertSame('5000_8000', $fresh->income_range);
        $this->assertNotNull($fresh->about_saved_at);

        $this->actingAs($user)->getJson('/api/me')->assertOk()
            ->assertJsonPath('parentProfile.income_range', '5000_8000')
            ->assertJsonPath('parentProfile.working_field', 'education')
            ->assertJsonPath('parentProfile.about_saved_at', fn ($value) => $value !== null);
    }

    public function test_every_answer_is_optional_and_saving_with_none_still_ends_the_nudge(): void
    {
        [$user, $profile] = $this->createParent($this->createTenant());
        $this->assertNull($profile->about_saved_at);

        $this->actingAs($user)->putJson('/api/parent/profile/about', [])->assertOk();

        $fresh = $profile->fresh();
        $this->assertNull($fresh->income_range);
        $this->assertNotNull($fresh->about_saved_at, 'they were asked; do not nag again');
    }

    public function test_prefer_not_to_say_is_a_valid_income_answer(): void
    {
        [$user] = $this->createParent($this->createTenant());

        $this->actingAs($user)->putJson('/api/parent/profile/about', ['income_range' => 'prefer_not_to_say'])
            ->assertOk()->assertJsonPath('income_range', 'prefer_not_to_say');
    }

    public function test_unknown_values_are_rejected(): void
    {
        [$user] = $this->createParent($this->createTenant());

        $this->actingAs($user)->putJson('/api/parent/profile/about', ['income_range' => 'a lot'])
            ->assertStatus(422)->assertJsonValidationErrors('income_range');
        $this->actingAs($user)->putJson('/api/parent/profile/about', ['working_field' => 'astronaut'])
            ->assertStatus(422)->assertJsonValidationErrors('working_field');
        $this->actingAs($user)->putJson('/api/parent/profile/about', ['occupation' => str_repeat('x', 101)])
            ->assertStatus(422)->assertJsonValidationErrors('occupation');
    }

    public function test_answers_can_be_cleared_again(): void
    {
        [$user, $profile] = $this->createParent($this->createTenant());
        $this->actingAs($user)->putJson('/api/parent/profile/about', $this->answers())->assertOk();

        $this->actingAs($user)->putJson('/api/parent/profile/about', ['occupation' => '   '])->assertOk();

        $fresh = $profile->fresh();
        $this->assertNull($fresh->income_range);
        $this->assertNull($fresh->occupation);
        $this->assertNull($fresh->working_field);
    }

    public function test_the_operator_never_sees_a_parents_answers(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        [$parentUser, $profile] = $this->createParent($tenant);
        $this->actingAs($parentUser)->putJson('/api/parent/profile/about', $this->answers())->assertOk();
        $student = Student::factory()->create(['tenant_id' => $tenant->id, 'parent_id' => $profile->id]);

        // Every operator screen that returns a parent: the student's own page, and the student list.
        $detail = $this->actingAs($admin)->getJson("/api/operator/students/{$student->id}")->assertOk();
        $list = $this->actingAs($admin)->getJson('/api/operator/students')->assertOk();

        foreach ([$detail, $list] as $response) {
            $body = $response->getContent();
            $this->assertStringNotContainsString('income_range', $body);
            $this->assertStringNotContainsString('5000_8000', $body);
            $this->assertStringNotContainsString('Primary school teacher', $body);
            $this->assertStringNotContainsString('working_field', $body);
        }
        // ...while the parent's own profile page does get them.
        $this->actingAs($parentUser)->getJson('/api/me')->assertJsonPath('parentProfile.occupation', 'Primary school teacher');
    }

    public function test_a_parent_cannot_set_answers_through_the_main_profile_form(): void
    {
        [$user, $profile] = $this->createParent($this->createTenant());

        $this->actingAs($user)->putJson('/api/parent/profile', [
            'full_name' => $profile->full_name,
            'ic_number' => $profile->ic_number,
            'phone' => $profile->phone,
            'email' => $profile->email,
            'income_range' => 'above_12000',
        ])->assertOk();

        $this->assertNull($profile->fresh()->income_range);
    }

    public function test_only_parents_can_use_the_about_endpoint(): void
    {
        $tenant = $this->createTenant();
        $operator = $this->createOperatorAdmin($tenant);

        $this->actingAs($operator)->putJson('/api/parent/profile/about', $this->answers())->assertForbidden();
    }
}
