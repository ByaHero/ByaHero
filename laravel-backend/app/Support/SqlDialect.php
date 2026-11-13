<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

final class SqlDialect
{
    public static function postgres(): bool
    {
        return DB::connection()->getDriverName() === 'pgsql';
    }

    public static function minutes(string $start, string $end): string
    {
        return self::postgres()
            ? "TRUNC(EXTRACT(EPOCH FROM (($end) - ($start))) / 60)"
            : "TIMESTAMPDIFF(MINUTE, $start, $end)";
    }

    public static function hour(string $column): string
    {
        return self::postgres() ? "EXTRACT(HOUR FROM $column)" : "HOUR($column)";
    }

    public static function daysAgo(int $days): string
    {
        return self::postgres()
            ? "(CURRENT_DATE - INTERVAL '$days days')"
            : "DATE_SUB(CURRENT_DATE, INTERVAL $days DAY)";
    }

    public static function aggregate(string $expression): string
    {
        return self::postgres()
            ? "STRING_AGG(DISTINCT CAST($expression AS text), ', ')"
            : "GROUP_CONCAT(DISTINCT $expression SEPARATOR ', ')";
    }

    public static function rounded(string $expression, int $places): string
    {
        return self::postgres()
            ? "ROUND(CAST(($expression) AS numeric), $places)"
            : "ROUND($expression, $places)";
    }

    public static function numberParameter(): string
    {
        return self::postgres() ? 'CAST(? AS numeric)' : '?';
    }
}
