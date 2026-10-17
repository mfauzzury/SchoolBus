<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** The Owner's edits to one email's wording. Only changed blocks are kept. */
class EmailTemplate extends Model
{
    public $incrementing = false;

    protected $primaryKey = 'template';

    protected $keyType = 'string';

    protected $fillable = ['template', 'blocks', 'updated_by'];

    protected $casts = ['blocks' => 'array'];
}
