<?php

namespace Tests\Feature\Services;

use App\Enums\BillingPeriod;
use App\Enums\InvoiceStatus;
use App\Enums\PackageType;
use App\Models\BusOperator;
use App\Models\ParentProfile;
use App\Models\Route;
use App\Models\Student;
use App\Models\User;
use App\Services\InvoiceGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvoiceGeneratorTest extends TestCase
{
    use RefreshDatabase;

    private function makeStudent(BusOperator $tenant, ParentProfile $parent, Route $route, BillingPeriod $billingPeriod): Student
    {
        return Student::create([
            'tenant_id' => $tenant->id,
            'parent_id' => $parent->id,
            'route_id' => $route->id,
            'full_name' => 'Test Child',
            'date_of_birth' => '2015-01-01',
            'school_name' => 'Test School',
            'package_type' => PackageType::Return,
            'billing_period' => $billingPeriod,
        ]);
    }

    public function test_generates_an_issued_invoice_for_a_students_route_and_billing_period(): void
    {
        $tenant = BusOperator::create([
            'company_name' => 'Test Co',
            'contact_person' => 'Owner',
            'contact_phone' => '0123456789',
            'email' => 'owner@test.test',
        ]);
        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Parent One',
            'email' => 'parent@test.test',
            'password' => 'password',
        ]);
        $parent = ParentProfile::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'full_name' => 'Parent One',
            'ic_number' => '900101-01-1111',
            'phone' => '0123456789',
            'email' => 'parent@test.test',
        ]);
        $route = Route::create([
            'tenant_id' => $tenant->id,
            'name' => 'Route A',
            'base_monthly_fee' => 150,
        ]);
        $student = $this->makeStudent($tenant, $parent, $route, BillingPeriod::Yearly);

        $invoice = app(InvoiceGenerator::class)->generate($student);

        $this->assertSame($student->id, $invoice->student_id);
        $this->assertSame($route->id, $invoice->route_id);
        $this->assertEquals(InvoiceStatus::Issued, $invoice->status);
        $this->assertEquals(1800.0, (float) $invoice->amount_before_discount);
        $this->assertEquals(270.0, (float) $invoice->discount_amount);
        $this->assertEquals(1530.0, (float) $invoice->final_amount);
        $this->assertNotNull($invoice->issued_at);
        $this->assertSame(now()->addDays(7)->toDateString(), $invoice->due_date->toDateString());
    }

    public function test_second_child_of_same_parent_gets_sibling_discount(): void
    {
        $tenant = BusOperator::create([
            'company_name' => 'Test Co',
            'contact_person' => 'Owner',
            'contact_phone' => '0123456789',
            'email' => 'owner2@test.test',
        ]);
        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Parent Two',
            'email' => 'parent2@test.test',
            'password' => 'password',
        ]);
        $parent = ParentProfile::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'full_name' => 'Parent Two',
            'ic_number' => '900101-01-2222',
            'phone' => '0123456789',
            'email' => 'parent2@test.test',
        ]);
        $route = Route::create([
            'tenant_id' => $tenant->id,
            'name' => 'Route B',
            'base_monthly_fee' => 100,
        ]);

        $firstChild = $this->makeStudent($tenant, $parent, $route, BillingPeriod::Monthly);
        $secondChild = $this->makeStudent($tenant, $parent, $route, BillingPeriod::Monthly);

        $generator = app(InvoiceGenerator::class);
        $firstInvoice = $generator->generate($firstChild);
        $secondInvoice = $generator->generate($secondChild);

        $this->assertEquals(100.0, (float) $firstInvoice->final_amount);
        $this->assertEquals(90.0, (float) $secondInvoice->final_amount);
    }

    public function test_throws_when_route_has_no_base_monthly_fee(): void
    {
        $tenant = BusOperator::create([
            'company_name' => 'Test Co',
            'contact_person' => 'Owner',
            'contact_phone' => '0123456789',
            'email' => 'owner3@test.test',
        ]);
        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Parent Three',
            'email' => 'parent3@test.test',
            'password' => 'password',
        ]);
        $parent = ParentProfile::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'full_name' => 'Parent Three',
            'ic_number' => '900101-01-3333',
            'phone' => '0123456789',
            'email' => 'parent3@test.test',
        ]);
        $route = Route::create([
            'tenant_id' => $tenant->id,
            'name' => 'Route C',
        ]);
        $student = $this->makeStudent($tenant, $parent, $route, BillingPeriod::Monthly);

        $this->expectException(\RuntimeException::class);

        app(InvoiceGenerator::class)->generate($student);
    }
}
