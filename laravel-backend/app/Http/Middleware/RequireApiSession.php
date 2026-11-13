<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RequireApiSession
{
    public function handle(Request $request, Closure $next)
    {
        if (!$request->isMethodSafe() && ($origin = $request->header('Origin'))) {
            $allowed = config('cors.allowed_origins', []);
            $allowed[] = $request->getSchemeAndHttpHost();
            if (!in_array($origin, $allowed, true)) {
                return response()->json(['success' => false, 'message' => 'Origin not allowed'], 403);
            }
        }

        $path = $request->path();
        if ($request->isMethod('GET') && in_array($path, [
            'api/app-version', 'api/ping', 'api/buses', 'api/buses/stops-terminal', 'api/buses/sync', 'api/map-data',
        ], true)) {
            return $next($request);
        }
        if ($path === 'api/auth' && in_array($request->input('action'), [
            'login', 'signup_request_otp', 'signup_verify_otp', 'request_otp', 'verify_otp', 'reset_password', 'google_auth',
        ], true)) {
            return $next($request);
        }

        $id = $request->session()->get('user_id');
        $role = $request->session()->get('user_role');
        if (!$id || !in_array($role, ['admin', 'conductor', 'driver', 'passenger'], true)) {
            return response()->json(['success' => false, 'message' => 'Authentication required'], 401);
        }
        $allowedRoles = match (true) {
            str_starts_with($path, 'api/admin/') => ['admin'],
            str_starts_with($path, 'api/conductor/') => ['conductor', 'driver'],
            in_array($path, ['api/auth', 'api/logout'], true) => ['admin', 'conductor', 'driver', 'passenger'],
            default => ['passenger'],
        };
        if (!in_array($role, $allowedRoles, true)) {
            return response()->json(['success' => false, 'message' => 'Role not allowed'], 403);
        }
        return $next($request);
    }
}
