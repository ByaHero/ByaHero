<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\File;

Route::get('/', function () {
    return redirect()->away('https://byahero.app');
});

Route::get('/assets/images/uploads/lost_and_found/{filename}', function ($filename) {
    $path = base_path('../assets/images/uploads/lost_and_found/' . $filename);
    if (!File::exists($path)) {
        abort(404);
    }
    $file = File::get($path);
    $type = File::mimeType($path);
    return response($file, 200)->header("Content-Type", $type);
});
