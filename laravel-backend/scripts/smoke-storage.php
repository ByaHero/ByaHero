<?php

require dirname(__DIR__).'/vendor/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$app->loadEnvironmentFrom('.env.supabase');
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Services\SupabaseUploads;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;

if (config('deployment.supabase_url') !== 'https://dvkpbydrrpurlbjsjlux.supabase.co'
    || config('deployment.supabase_bucket') !== 'byahero-test-uploads') {
    fwrite(STDERR, "Refusing to test another storage project/bucket.\n");
    exit(1);
}

$temporary = tempnam(sys_get_temp_dir(), 'byahero-storage-test-');
$contents = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=');
file_put_contents($temporary, $contents);
$path = null;
$failed = false;
try {
    $service = new SupabaseUploads;
    $path = $service->upload(new UploadedFile($temporary, 'smoke.png', 'image/png', null, true));
    $response = Http::timeout(15)->get($service->signedUrl(basename($path)));
    if (!$response->successful() || !hash_equals(hash('sha256', $contents), hash('sha256', $response->body()))) {
        throw new RuntimeException('Signed download did not match the uploaded bytes.');
    }
    echo "Private upload and signed download verified against Supabase.\n";
} catch (Throwable $e) {
    $failed = true;
    fwrite(STDERR, "Storage smoke test failed; no source assets were changed.\n");
} finally {
    unlink($temporary);
    if ($path !== null) {
        $key = config('deployment.supabase_key');
        $cleanup = Http::timeout(15)->withHeaders(['apikey' => $key, 'Authorization' => 'Bearer '.$key])
            ->delete(config('deployment.supabase_url').'/storage/v1/object/byahero-test-uploads', [
                'prefixes' => ['lost_and_found/'.basename($path)],
            ]);
        if (!$cleanup->successful()) {
            $failed = true;
            fwrite(STDERR, "Test-object cleanup failed; remove the smoke-test object from the test bucket.\n");
        } else {
            echo "Temporary test object removed.\n";
        }
    }
}
exit($failed ? 1 : 0);
