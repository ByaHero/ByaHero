<?php
declare(strict_types=1);

/**
 * ByaHero Bootstrap - Environment Loader
 * Loads .env file into $_ENV and getenv()
 */
(function() {
    global $_ENV;
    $envPath = realpath(__DIR__ . '/../.env') ?: (__DIR__ . '/../.env');
    if (file_exists($envPath)) {
        $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            error_log("ByaHero: Failed to read .env file at $envPath");
            return;
        }
        $loadedCount = 0;
        foreach ($lines as $index => $line) {
            // Remove UTF-8 BOM if present on the first line
            if ($index === 0) {
                $line = preg_replace('/^[\xef\xbb\xbf]+/', '', $line);
            }
            $line = trim($line);
            if (!$line || strpos($line, '#') === 0) continue;
            if (strpos($line, '=') !== false) {
                list($name, $value) = explode('=', $line, 2);
                $name = trim($name);
                $value = trim($value);
                // Remove optional quotes
                $value = trim($value, '"\'');
                // Unescape newlines for private keys
                $value = str_replace('\n', "\n", $value);
                $_ENV[$name] = $value;
                putenv("$name=$value");
                $loadedCount++;
            }
        }
        error_log("ByaHero: Successfully loaded $loadedCount variables from .env");
    } else {
        error_log("ByaHero: .env file NOT FOUND at $envPath");
    }
})();

function get_env_config(string $key, string $default): string {
    global $_ENV;
    if (isset($_ENV[$key]) && $_ENV[$key] !== '') {
        return $_ENV[$key];
    }
    $val = getenv($key);
    return ($val !== false && $val !== '') ? $val : $default;
}
