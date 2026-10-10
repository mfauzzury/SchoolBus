<?php

namespace Tests\Feature\ParentPortal;

use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class StudentProfileTest extends TestCase
{
    use CreatesTestData, RefreshDatabase;

    private function childOf(array $parent, array $attributes = []): Student
    {
        [, $profile] = $parent;

        return Student::factory()->create([
            'tenant_id' => $profile->tenant_id,
            'parent_id' => $profile->id,
            ...$attributes,
        ]);
    }

    public function test_parent_can_update_their_childs_name_birth_date_and_sex(): void
    {
        $tenant = $this->createTenant();
        $parent = $this->createParent($tenant);
        $child = $this->childOf($parent, ['full_name' => 'Old Name', 'gender' => null]);

        $response = $this->actingAs($parent[0])->putJson("/api/parent/students/{$child->id}", [
            'full_name' => 'Aiman Hakim',
            'date_of_birth' => '2017-03-14',
            'gender' => 'male',
        ]);

        $response->assertOk()->assertJsonPath('full_name', 'Aiman Hakim')->assertJsonPath('gender', 'male');
        $child->refresh();
        $this->assertSame('Aiman Hakim', $child->full_name);
        $this->assertSame('2017-03-14', $child->date_of_birth->toDateString());
        $this->assertSame('male', $child->gender);
    }

    public function test_parent_can_add_and_clear_teacher_class_and_school_phone(): void
    {
        $tenant = $this->createTenant();
        $parent = $this->createParent($tenant);
        $child = $this->childOf($parent);
        $base = ['full_name' => $child->full_name, 'date_of_birth' => '2016-01-01'];

        $this->actingAs($parent[0])->putJson("/api/parent/students/{$child->id}", [
            ...$base,
            'teacher_name' => 'Cikgu Aminah',
            'class_name' => '3 Bestari',
            'school_phone' => '03-1234 5678',
        ])->assertOk()
            ->assertJsonPath('teacher_name', 'Cikgu Aminah')
            ->assertJsonPath('class_name', '3 Bestari')
            ->assertJsonPath('school_phone', '03-1234 5678');

        $this->actingAs($parent[0])->putJson("/api/parent/students/{$child->id}", [
            ...$base,
            'teacher_name' => '',
            'class_name' => null,
            'school_phone' => '',
        ])->assertOk();

        $child->refresh();
        $this->assertNull($child->teacher_name);
        $this->assertNull($child->class_name);
        $this->assertNull($child->school_phone);
    }

    public function test_update_does_not_touch_school_route_or_billing(): void
    {
        $tenant = $this->createTenant();
        $parent = $this->createParent($tenant);
        $child = $this->childOf($parent, ['school_name' => 'SK Bukit', 'enrollment_status' => 'active']);

        $this->actingAs($parent[0])->putJson("/api/parent/students/{$child->id}", [
            'full_name' => 'New Name',
            'date_of_birth' => '2016-01-01',
            'school_name' => 'Hacked School',
            'enrollment_status' => 'withdrawn',
            'fee_override' => '1.00',
        ])->assertOk();

        $child->refresh();
        $this->assertSame('SK Bukit', $child->school_name);
        $this->assertSame('active', $child->enrollment_status);
        $this->assertNull($child->fee_override);
    }

    public function test_update_validates_input(): void
    {
        $tenant = $this->createTenant();
        $parent = $this->createParent($tenant);
        $child = $this->childOf($parent);

        $this->actingAs($parent[0])->putJson("/api/parent/students/{$child->id}", [
            'full_name' => '',
            'date_of_birth' => now()->addDay()->toDateString(),
            'gender' => 'other',
        ])->assertStatus(422)->assertJsonValidationErrors(['full_name', 'date_of_birth', 'gender']);
    }

    public function test_parent_cannot_edit_another_parents_child(): void
    {
        $tenant = $this->createTenant();
        $parent = $this->createParent($tenant);
        $other = $this->createParent($tenant);
        $child = $this->childOf($other, ['full_name' => 'Not Yours']);

        $this->actingAs($parent[0])->putJson("/api/parent/students/{$child->id}", [
            'full_name' => 'Hijacked',
            'date_of_birth' => '2016-01-01',
        ])->assertNotFound();

        $this->actingAs($parent[0])
            ->post("/api/parent/students/{$child->id}/avatar", ['avatar' => UploadedFile::fake()->image('a.jpg')])
            ->assertNotFound();

        $this->assertSame('Not Yours', $child->fresh()->full_name);
    }

    public function test_parent_can_upload_and_replace_a_photo(): void
    {
        Storage::fake('public');
        $tenant = $this->createTenant();
        $parent = $this->createParent($tenant);
        $child = $this->childOf($parent);

        $first = $this->actingAs($parent[0])
            ->post("/api/parent/students/{$child->id}/avatar", ['avatar' => UploadedFile::fake()->image('a.jpg')])
            ->assertOk();

        $firstPath = $child->fresh()->avatar_path;
        Storage::disk('public')->assertExists($firstPath);
        $this->assertNotNull($first->json('avatar_url'));

        $this->actingAs($parent[0])
            ->post("/api/parent/students/{$child->id}/avatar", ['avatar' => UploadedFile::fake()->image('b.jpg')])
            ->assertOk();

        Storage::disk('public')->assertMissing($firstPath);
        Storage::disk('public')->assertExists($child->fresh()->avatar_path);
    }

    public function test_photo_must_be_an_image(): void
    {
        Storage::fake('public');
        $tenant = $this->createTenant();
        $parent = $this->createParent($tenant);
        $child = $this->childOf($parent);

        $this->actingAs($parent[0])
            ->post(
                "/api/parent/students/{$child->id}/avatar",
                ['avatar' => UploadedFile::fake()->create('doc.pdf', 10, 'application/pdf')],
                ['Accept' => 'application/json'],
            )
            ->assertStatus(422)->assertJsonValidationErrors(['avatar']);
    }

    public function test_operator_cannot_use_the_parent_student_endpoints(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createOperatorAdmin($tenant);
        $child = $this->childOf($this->createParent($tenant));

        $this->actingAs($admin)->putJson("/api/parent/students/{$child->id}", [
            'full_name' => 'X',
            'date_of_birth' => '2016-01-01',
        ])->assertForbidden();
    }
}
