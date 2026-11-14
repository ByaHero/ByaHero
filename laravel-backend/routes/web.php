<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\File;

Route::get('/', function () {
    return redirect()->away('https://byahero.app');
});

// Google returns the ID token in the URL fragment; it never reaches Laravel.
Route::get('/auth/google/callback', function () {
    return response()->view('auth.google-callback')->withHeaders([
        'Cache-Control' => 'no-store, private',
        'Referrer-Policy' => 'no-referrer',
        'X-Content-Type-Options' => 'nosniff',
        'Content-Security-Policy' => "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    ]);
})->withoutMiddleware([
    \Illuminate\Session\Middleware\StartSession::class,
    \Illuminate\View\Middleware\ShareErrorsFromSession::class,
    \Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
]);

// Optional static admin test build, included only in the isolated test deployment.
Route::get('/admin-test/{path?}', function () {
    abort_unless(config('deployment.admin_test_enabled', false), 404);
    $index = public_path('admin-test/index.html');
    abort_unless(is_file($index), 404);
    return response()->file($index, ['Cache-Control' => 'no-store']);
})->where('path', '.*');

Route::get('/assets/images/uploads/lost_and_found/{filename}', function ($filename) {
    abort_unless(preg_match('/\A[a-zA-Z0-9_.-]+\z/', $filename) && !str_contains($filename, '..'), 404);
    if (config('deployment.role') === 'production') {
        $id = session('user_id');
        $role = session('user_role');
        abort_unless($id && in_array($role, ['admin', 'passenger'], true), 401);
        if ($role !== 'admin') {
            $path = 'assets/images/uploads/lost_and_found/'.$filename;
            $owned = \Illuminate\Support\Facades\DB::table('lost_and_found')->where('user_id', $id)
                ->where(fn ($q) => $q->where('image1_path', $path)->orWhere('image2_path', $path))->exists();
            abort_unless($owned, 404);
        }
    }
    if (config('deployment.uploads') === 'supabase') {
        try {
            return redirect()->away(app(\App\Services\SupabaseUploads::class)->signedUrl($filename));
        } catch (\RuntimeException $e) {
            abort(404);
        }
    }
    $path = base_path('../assets/images/uploads/lost_and_found/' . $filename);
    if (!File::exists($path)) {
        abort(404);
    }
    $file = File::get($path);
    $type = File::mimeType($path);
    return response($file, 200)->header("Content-Type", $type);
})->where('filename', '[a-zA-Z0-9_.-]+');
