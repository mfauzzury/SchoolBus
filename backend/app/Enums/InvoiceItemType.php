<?php

namespace App\Enums;

enum InvoiceItemType: string
{
    case Fee = 'fee';
    case Discount = 'discount';
    case Adjustment = 'adjustment';
    // A monthly charge on top of the bus fee, e.g. going via a transit center (see StudentExtra).
    case Extra = 'extra';
}
