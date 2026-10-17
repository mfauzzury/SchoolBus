<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\EmailTemplate;
use App\Support\ActivityLog;
use App\Support\EmailTemplates;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * The Owner's view of the emails sent to parents: what each one looks like (drawn with
 * sample data) and the wording they can change. Names, amounts and tables stay automatic.
 */
class EmailTemplateController extends Controller
{
    public function index()
    {
        return collect(EmailTemplates::all())->map(function (array $meta, string $template) {
            $custom = EmailTemplates::customised($template);

            return [
                'template' => $template,
                'notification_type' => $meta['notification_type'],
                'editable' => $meta['blocks'] !== [],
                'placeholders' => $meta['placeholders'],
                'customised' => $custom !== [],
                'blocks' => collect($meta['blocks'])->map(fn (string $default, string $block) => [
                    'key' => $block,
                    'default' => $default,
                    'value' => $custom[$block] ?? $default,
                ])->values(),
            ];
        })->values();
    }

    public function preview(Request $request, string $template)
    {
        abort_unless(EmailTemplates::exists($template), 404);

        $data = $request->validate([
            'blocks' => 'nullable|array',
            'blocks.*' => 'nullable|string|max:400',
        ]);

        return EmailTemplates::preview($template, $data['blocks'] ?? null);
    }

    public function update(Request $request, string $template)
    {
        $this->editable($template);

        $data = $request->validate([
            'blocks' => 'required|array',
            'blocks.*' => 'nullable|string|max:400',
        ]);

        $known = EmailTemplates::all()[$template]['blocks'];
        $keep = [];

        foreach ($data['blocks'] as $block => $text) {
            if (! array_key_exists($block, $known)) {
                throw ValidationException::withMessages(["blocks.$block" => 'Unknown part of this email.']);
            }

            $text = trim((string) $text);
            if ($text === '' || $text === $known[$block]) {
                continue; // Same as the built-in wording: nothing to store.
            }

            if ($unknown = EmailTemplates::unknownPlaceholders($template, $text)) {
                throw ValidationException::withMessages([
                    "blocks.$block" => 'Unknown placeholder: {'.implode('}, {', $unknown).'}',
                ]);
            }

            $keep[$block] = $text;
        }

        if ($keep === []) {
            EmailTemplate::whereKey($template)->delete();
        } else {
            EmailTemplate::updateOrCreate(
                ['template' => $template],
                ['blocks' => $keep, 'updated_by' => $request->user()->id],
            );
        }

        ActivityLog::record('email_template_updated', properties: ['template' => $template, 'blocks' => array_keys($keep)]);

        return ['template' => $template, 'customised' => $keep !== []];
    }

    /** Back to the built-in wording. */
    public function destroy(string $template)
    {
        $this->editable($template);

        EmailTemplate::whereKey($template)->delete();

        ActivityLog::record('email_template_reset', properties: ['template' => $template]);

        return response()->json(null, 204);
    }

    private function editable(string $template): void
    {
        abort_unless(EmailTemplates::exists($template) && EmailTemplates::all()[$template]['blocks'] !== [], 404);
    }
}
