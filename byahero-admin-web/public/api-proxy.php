<?php
declare(strict_types=1);

// Same-origin browser session proxy. Application data/authentication remain in Laravel.
$upstreamOrigin = 'https://api.byahero.app';
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($requestUri, PHP_URL_PATH);
if (!is_string($path) || !preg_match('#^/(api(?:/|$)|assets/images/uploads/|routes/)#', $path)
    || str_contains(rawurldecode($path), '..') || preg_match('/[\r\n]/', $requestUri)) {
    http_response_code(404); exit;
}
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if (!in_array($method, ['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'], true)) { http_response_code(405); exit; }
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$host = $_SERVER['HTTP_HOST'] ?? '';
if ($origin !== '' && !in_array($origin, ['https://'.$host, 'http://'.$host], true)) {
    http_response_code(403); header('Content-Type: application/json');
    echo '{"success":false,"message":"Origin not allowed"}'; exit;
}
$body = file_get_contents('php://input');
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 4 * 1024 * 1024) { http_response_code(413); exit; }
if ($body === false || strlen($body) > 4 * 1024 * 1024) { http_response_code(413); exit; }
$headers = ['Accept: application/json'];
$multipart = !empty($_FILES);
if ($multipart) {
    $body = $_POST;
    foreach ($_FILES as $name => $file) {
        if (is_array($file['name']) || $file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) { http_response_code(400); exit; }
        $body[$name] = new CURLFile($file['tmp_name'], $file['type'], $file['name']);
    }
}
if (!$multipart && isset($_SERVER['CONTENT_TYPE'])) $headers[] = 'Content-Type: '.$_SERVER['CONTENT_TYPE'];
if ($origin !== '') $headers[] = 'Origin: '.$upstreamOrigin;
if (!empty($_COOKIE['byahero_production_session'])) {
    $headers[] = 'Cookie: byahero_production_session='.rawurlencode($_COOKIE['byahero_production_session']);
}
$responseHeaders = [];
$curl = curl_init($upstreamOrigin.$requestUri);
curl_setopt_array($curl, [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 60,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_HEADERFUNCTION => static function ($handle, string $line) use (&$responseHeaders): int {
        $length = strlen($line);
        $parts = explode(':', $line, 2);
        if (count($parts) === 2) {
            $name = strtolower(trim($parts[0]));
            if (in_array($name, ['content-type','set-cookie','location','retry-after'], true)) {
                $value = trim($parts[1]);
                if ($name === 'set-cookie') $value = preg_replace('/;\s*Domain=[^;]+/i', '', $value);
                $responseHeaders[] = [$name, $value];
            }
        }
        return $length;
    },
]);
if (!in_array($method, ['GET','HEAD'], true)) curl_setopt($curl, CURLOPT_POSTFIELDS, $body);
$response = curl_exec($curl);
$status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
curl_close($curl);
header('Cache-Control: no-store, private');
if ($response === false || $status < 100) {
    http_response_code(502); header('Content-Type: application/json');
    echo '{"success":false,"message":"API temporarily unavailable"}'; exit;
}
http_response_code($status);
foreach ($responseHeaders as [$name, $value]) header($name.': '.$value, false);
if ($method !== 'HEAD') echo $response;
