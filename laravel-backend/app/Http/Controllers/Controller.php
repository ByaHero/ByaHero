<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\DB;

abstract class Controller
{
    /**
     * Resolve authenticated user ID from Session, Request Parameter, or X-User-Email header.
     * This provides cross-origin authentication resilience for mobile browsers (iOS Safari/Chrome)
     * where third-party session cookies are blocked.
     */
    protected function getAuthUserId(?Request $request = null, ?string &$resolvedRole = null): ?int
    {
        $userId = Session::get('user_id');
        if (!empty($userId)) {
            $resolvedRole = Session::get('user_role', 'passenger');
            return (int)$userId;
        }

        if (!$request) {
            $request = request();
        }

        $email = $request->input('email') ?: $request->header('X-User-Email');
        if (!empty($email)) {
            $cleanEmail = strtolower(trim((string)$email));

            // 1. Check users (passengers)
            $user = DB::table('users')->where('email', $cleanEmail)->first();
            if ($user) {
                $resolvedRole = 'passenger';
                Session::put('user_id', (int)$user->id);
                Session::put('user_role', 'passenger');
                Session::put('user_email', $user->email);
                Session::put('user_name', $user->name ?? '');
                return (int)$user->id;
            }

            // 2. Check admins
            $admin = DB::table('admins')->where('email', $cleanEmail)->first();
            if ($admin) {
                $resolvedRole = 'admin';
                Session::put('user_id', (int)$admin->id);
                Session::put('user_role', 'admin');
                Session::put('user_email', $admin->email);
                return (int)$admin->id;
            }

            // 3. Check drivers
            $driver = DB::table('drivers')->where('email', $cleanEmail)->first();
            if ($driver) {
                $resolvedRole = 'driver';
                Session::put('user_id', (int)$driver->id);
                Session::put('user_role', 'driver');
                Session::put('user_email', $driver->email);
                return (int)$driver->id;
            }

            // 4. Check conductors
            $conductor = DB::table('conductors')->where('email', $cleanEmail)->first();
            if ($conductor) {
                $resolvedRole = 'conductor';
                Session::put('user_id', (int)$conductor->id);
                Session::put('user_role', 'conductor');
                Session::put('user_email', $conductor->email);
                return (int)$conductor->id;
            }
        }

        return null;
    }
}

