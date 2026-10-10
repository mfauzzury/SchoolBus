<?php

namespace App\Enums;

enum InvoiceItemType: string
{
    case Fee = 'fee';
    case Discount = 'discount';
    case Adjustment = 'adjustment';
}
