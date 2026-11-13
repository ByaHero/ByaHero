<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class SupabaseUploads
{
    public function upload(UploadedFile $file): string
    {
        $filename = 'lf_'.Str::uuid().'.'.$file->extension();
        $this->put('lost_and_found/'.$filename, $file->getContent(), $file->getMimeType());
        // Preserve the legacy API shape and attachment route for existing clients.
        return 'assets/images/uploads/lost_and_found/'.$filename;
    }

    public function put(string $path, string $contents, string $mime): void
    {
        $response = $this->client()->withBody($contents, $mime)
            ->post($this->objectUrl($path));
        if (!$response->successful()) {
            throw new RuntimeException('Upload storage rejected the file (HTTP '.$response->status().').');
        }
    }

    public function signedUrl(string $filename): string
    {
        $path = 'lost_and_found/'.$filename;
        $url = str_replace('/object/', '/object/sign/', $this->objectUrl($path));
        $response = $this->client()->post($url, ['expiresIn' => 300]);
        if (!$response->successful() || !is_string($response->json('signedURL'))) {
            throw new RuntimeException('Attachment not available.');
        }
        return config('deployment.supabase_url').'/storage/v1'.$response->json('signedURL');
    }

    private function client(): \Illuminate\Http\Client\PendingRequest
    {
        $key = config('deployment.supabase_key');
        if (!$key || !config('deployment.supabase_url')) {
            throw new RuntimeException('Supabase upload storage is not configured.');
        }
        return Http::timeout(20)->withHeaders(['apikey' => $key, 'Authorization' => 'Bearer '.$key]);
    }

    private function objectUrl(string $path): string
    {
        $path = implode('/', array_map('rawurlencode', explode('/', $path)));
        return config('deployment.supabase_url').'/storage/v1/object/'
            .rawurlencode(config('deployment.supabase_bucket')).'/'.$path;
    }
}
