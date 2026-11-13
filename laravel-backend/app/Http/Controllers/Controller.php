<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;

abstract class Controller
{
    /**
     * Resolve identity only from the authenticated server session.
     */
    protected function getAuthUserId(?Request $request = null, ?string &$resolvedRole = null): ?int
    {
        $userId = Session::get('user_id');
        if (!empty($userId)) {
            $resolvedRole = Session::get('user_role', 'passenger');
            return (int)$userId;
        }

        return null;
    }
}

