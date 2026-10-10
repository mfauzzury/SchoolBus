<?php

namespace Database\Factories;

use App\Enums\BillingPeriod;
use App\Enums\InvoiceItemType;
use App\Enums\InvoiceStatus;
use App\Enums\PackageType;
use App\Models\BusOperator;
use App\Models\Invoice;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Invoice>
 */
class InvoiceFactory extends Factory
{
    protected $model = Invoice::class;

    public function definition(): array
    {
        return [
            'tenant_id' => BusOperator::factory(),
            'student_id' => Student::factory(),
            'package_type' => PackageType::Return,
            'billing_period' => BillingPeriod::Monthly,
            'amount_before_discount' => 150,
            'discount_amount' => 0,
            'final_amount' => 150,
            'status' => InvoiceStatus::Issued,
            'due_date' => now()->addDays(7)->toDateString(),
            'issued_at' => now(),
        ];
    }

    /**
     * Real invoices always carry the items their totals are derived from, so
     * factory ones get items matching whatever amounts the test asked for.
     */
    public function configure(): static
    {
        return $this->afterCreating(function (Invoice $invoice) {
            $invoice->items()->create([
                'tenant_id' => $invoice->tenant_id,
                'type' => InvoiceItemType::Fee,
                'description' => 'Bus fee',
                'amount' => $invoice->amount_before_discount,
            ]);

            if ((float) $invoice->discount_amount > 0) {
                $invoice->items()->create([
                    'tenant_id' => $invoice->tenant_id,
                    'type' => InvoiceItemType::Discount,
                    'description' => 'Discount',
                    'amount' => -1 * (float) $invoice->discount_amount,
                ]);
            }
        });
    }

    public function paid(): static
    {
        return $this->state([
            'status' => InvoiceStatus::Paid,
            'paid_at' => now(),
        ]);
    }

    public function overdue(): static
    {
        return $this->state([
            'status' => InvoiceStatus::Issued,
            'due_date' => now()->subDays(3)->toDateString(),
        ]);
    }
}
