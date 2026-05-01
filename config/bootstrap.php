<?php
declare(strict_types=1);

/**
 * ByaHero Bootstrap - Environment Loader
 * Loads .env file into $_ENV and getenv()
 */
(function() {
    $envPath = __DIR__ . '/../.env';
    if (file_exists($envPath)) {
        $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
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
            }
        }
    }
})();

function get_env_config(string $key, string $default): string {
    $val = getenv($key);
    return ($val !== false && $val !== '') ? $val : $default;
}
