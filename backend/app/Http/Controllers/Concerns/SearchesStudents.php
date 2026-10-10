<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * The operator's "find by name" box: matches a child's own name or their
 * parent's, anywhere in the name, ignoring case.
 */
trait SearchesStudents
{
    /**
     * Narrow a query on students to those matching the request's `search` text.
     * A no-op when no text was given.
     */
    private function matchStudentSearch(Builder $students, Request $request): void
    {
        $text = $request->string('search')->trim()->lower()->toString();

        if ($text === '') {
            return;
        }

        // Escaped so a typed % or _ is a plain character, not a wildcard.
        $term = '%'.addcslashes($text, '%_\\').'%';

        $students->where(fn (Builder $q) => $q
            ->whereRaw("LOWER(students.full_name) LIKE ? ESCAPE '\\'", [$term])
            ->orWhereHas('parentProfile', fn (Builder $parent) => $parent
                ->whereRaw("LOWER(parents.full_name) LIKE ? ESCAPE '\\'", [$term])));
    }
}
