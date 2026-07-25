<?php

namespace Tests\Feature\Public;

use App\Models\ContactMessage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContactControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_stores_a_contact_message(): void
    {
        $response = $this->postJson('/api/contact', [
            'name' => 'Jane Tan',
            'email' => 'jane@example.test',
            'phone' => '012-3456789',
            'message' => 'How much for 20 students on one route?',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('contact_messages', [
            'name' => 'Jane Tan',
            'email' => 'jane@example.test',
        ]);
    }

    public function test_phone_is_optional(): void
    {
        $response = $this->postJson('/api/contact', [
            'name' => 'Jane Tan',
            'email' => 'jane@example.test',
            'message' => 'General question.',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('contact_messages', ['phone' => null]);
    }

    public function test_it_requires_name_email_and_message(): void
    {
        $response = $this->postJson('/api/contact', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email', 'message']);
        $this->assertSame(0, ContactMessage::count());
    }

    public function test_it_requires_a_valid_email(): void
    {
        $response = $this->postJson('/api/contact', [
            'name' => 'Jane Tan',
            'email' => 'not-an-email',
            'message' => 'Hello',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['email']);
    }
}
