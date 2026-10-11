<?php

namespace Tests\Feature\Notifications;

use App\Models\User;
use App\Notifications\BillsIssued;
use App\Notifications\PaymentReceived;
use App\Notifications\PaymentReminder;
use App\Support\MailText;
use Tests\TestCase;

class NotificationEmailLayoutTest extends TestCase
{
    private function html($mail): string
    {
        return (string) $mail->render();
    }

    public function test_a_bill_email_lists_each_child_in_a_table_with_a_total(): void
    {
        $mail = (new BillsIssued('Shahrul Transport', 'Aminah', [
            ['student' => 'Aiman', 'amount' => '120.00', 'due_date' => '2026-11-07'],
            ['student' => 'Aisyah', 'amount' => '108.00', 'due_date' => '2026-11-07'],
        ]))->toMail(new User);

        $html = $this->html($mail);

        $this->assertStringContainsString('<table', $html);
        $this->assertStringContainsString('Aiman', $html);
        $this->assertStringContainsString('RM 120.00', $html);
        $this->assertStringContainsString('Aisyah', $html);
        $this->assertStringContainsString('RM 108.00', $html);
        $this->assertStringContainsString('RM 228.00', $html);
        $this->assertStringContainsString('Jumlah / Total', $html);
    }

    public function test_a_single_child_has_no_total_row(): void
    {
        $mail = (new BillsIssued('Shahrul Transport', 'Aminah', [
            ['student' => 'Aiman', 'amount' => '120.00', 'due_date' => '2026-11-07'],
        ]))->toMail(new User);

        $this->assertStringNotContainsString('Jumlah / Total', $this->html($mail));
    }

    public function test_reminders_and_receipts_use_the_same_table(): void
    {
        $lines = [['student' => 'Aiman', 'amount' => '120.00', 'due_date' => '2026-11-07']];

        $reminder = $this->html((new PaymentReminder('overdue', 'Shahrul Transport', 'Aminah', $lines))->toMail(new User));
        $this->assertStringContainsString('Baki / Balance', $reminder);
        $this->assertStringContainsString('RM 120.00', $reminder);

        $receipt = $this->html((new PaymentReceived('Shahrul Transport', 'Aminah', $lines, '2026-11-03'))->toMail(new User));
        $this->assertStringContainsString('Jumlah / Amount', $receipt);
        $this->assertStringContainsString('RM 120.00', $receipt);
    }

    public function test_a_childs_name_cannot_inject_markup_or_a_link_into_the_table(): void
    {
        $html = $this->html((new BillsIssued('Shahrul Transport', 'Aminah', [
            ['student' => '<script>alert(1)</script> [Pay](http://bad.example)', 'amount' => '10.00', 'due_date' => '2026-11-07'],
        ]))->toMail(new User));

        $this->assertStringNotContainsString('<script>', $html);
        $this->assertStringNotContainsString('href="http://bad.example"', $html);
        $this->assertStringContainsString('&lt;script&gt;', $html);
    }

    public function test_a_table_keeps_its_rows_on_consecutive_lines_so_markdown_does_not_split_it(): void
    {
        $table = (string) MailText::table(['A', 'B'], [['one', '1'], ['two', '2']], ['Total', '3']);

        $this->assertStringNotContainsString("\n\n", $table);
        $this->assertSame(1, substr_count($table, '<table'));
        $this->assertSame(1, substr_count($table, '<th>') + substr_count($table, '<th align') - 1);
    }
}
