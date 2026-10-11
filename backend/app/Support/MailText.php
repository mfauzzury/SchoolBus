<?php

namespace App\Support;

use Illuminate\Support\HtmlString;

/**
 * Makes text typed by a person (a name, a company, a reason) safe to place in
 * an email. Our emails are written in Markdown, so without this a name like
 * "[Pay here](http://bad.example)" would become a real link in an email that
 * carries our name.
 */
class MailText
{
    /** For message bodies: Markdown characters are escaped and line breaks flattened. */
    public static function plain(?string $value): string
    {
        return preg_replace('/([\\\\`*_{}\\[\\]()#+!|<>~])/', '\\\\$1', self::oneLine($value)) ?? '';
    }

    /** For subject lines: plain text already, but must stay on one line. */
    public static function oneLine(?string $value): string
    {
        return trim((string) preg_replace('/\\s+/', ' ', (string) $value));
    }

    /**
     * A small table for an email: one row per child with what is due or paid.
     * Every cell is escaped here, so pass the raw text (not plain()). The result
     * is built on lines with no blank line between them, because a blank line
     * would end the HTML block when the message is turned from Markdown to HTML.
     * The last column is right-aligned, as amounts are.
     *
     * @param  list<string>  $head
     * @param  list<list<string>>  $rows
     * @param  list<string>|null  $footer  a bold closing row, e.g. the total
     */
    public static function table(array $head, array $rows, ?array $footer = null): HtmlString
    {
        $last = count($head) - 1;
        $cell = function (string $tag, string $text, int $column, bool $bold = false) use ($last): string {
            // The amount column stays on one line and to the right, even on a phone.
            $align = $column === $last ? ' align="right" style="white-space: nowrap;"' : '';
            $text = e(self::oneLine($text));

            return "<{$tag}{$align}>".($bold && $text !== '' ? "<strong>{$text}</strong>" : $text)."</{$tag}>";
        };
        $row = fn (array $cells, string $tag = 'td', bool $bold = false): string => '<tr>'.implode(' ', array_map(
            fn (string $text, int $column) => $cell($tag, $text, $column, $bold),
            $cells,
            array_keys($cells),
        )).'</tr>';

        $lines = ['<div class="table">', '<table width="100%" cellpadding="0" cellspacing="0" role="presentation">'];
        $lines[] = $row($head, 'th');
        foreach ($rows as $cells) {
            $lines[] = $row($cells);
        }
        if ($footer !== null) {
            $lines[] = $row($footer, 'td', true);
        }
        $lines[] = '</table>';
        $lines[] = '</div>';

        return new HtmlString(implode("\n", $lines));
    }

    /** The name every email is signed with and carries in its header. */
    public static function brand(): string
    {
        return (string) config('app.name');
    }
}
