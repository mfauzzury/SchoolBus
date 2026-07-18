<?php

namespace App\Enums;

enum PackageType: string
{
    case OneWay = 'one_way';
    case Return = 'return';
}
