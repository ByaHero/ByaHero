<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        \Illuminate\Support\Facades\RateLimiter::for('auth-actions', function (\Illuminate\Http\Request $request) {
            $email = hash('sha256', strtolower(trim((string) $request->input('email', ''))));
            return [
                \Illuminate\Cache\RateLimiting\Limit::perMinute(30)->by('auth-ip:'.$request->ip()),
                \Illuminate\Cache\RateLimiting\Limit::perMinute(10)->by('auth-account:'.$request->ip().':'.$email),
            ];
        });
    }
}
