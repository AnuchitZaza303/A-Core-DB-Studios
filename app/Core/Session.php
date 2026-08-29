<?php
namespace App\Core;

class Session
{
    private static bool $started = false;
    private static ?string $token = null;
    private static array $data = [];
    private static string $storageDir = '';

    private static function getStorageDir(): string
    {
        if (empty(self::$storageDir)) {
            $dir = __DIR__ . '/../../storage/sessions';
            if (!is_dir($dir)) {
                @mkdir($dir, 0777, true);
            }
            self::$storageDir = $dir;
        }
        return self::$storageDir;
    }

    public static function start(): void
    {
        if (!self::$started) {
            $config = require __DIR__ . '/../../config/app.php';

            // Detect HTTPS (including Cloudflare, Proxies, Load Balancers)
            $isHttps = (isset($_SERVER['HTTPS']) && ($_SERVER['HTTPS'] === 'on' || $_SERVER['HTTPS'] === 1)) 
                || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
                || (isset($_SERVER['HTTP_CF_VISITOR']) && str_contains($_SERVER['HTTP_CF_VISITOR'], 'https'))
                || (isset($_SERVER['HTTP_X_FORWARDED_SSL']) && $_SERVER['HTTP_X_FORWARDED_SSL'] === 'on')
                || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);

            if (session_status() === PHP_SESSION_NONE) {
                @session_set_cookie_params([
                    'lifetime' => (int)($config['session_lifetime'] ?? 86400 * 7),
                    'path' => '/',
                    'domain' => '',
                    'secure' => $isHttps,
                    'httponly' => true,
                    'samesite' => $isHttps ? 'None' : 'Lax',
                ]);
                @session_name($config['session_name'] ?? 'acore_db_studio_session');
                @session_start();
            }

            // Extract Token from Header, Bearer Auth, or Session
            $headerToken = $_SERVER['HTTP_X_ACORE_TOKEN'] ?? null;
            if (!$headerToken && isset($_SERVER['HTTP_AUTHORIZATION'])) {
                if (preg_match('/Bearer\s+(.*)$/i', $_SERVER['HTTP_AUTHORIZATION'], $matches)) {
                    $headerToken = trim($matches[1]);
                }
            }

            self::$token = $headerToken ?: ($_SESSION['app_token'] ?? null);
            if (!self::$token) {
                self::$token = bin2hex(random_bytes(24));
                $_SESSION['app_token'] = self::$token;
            }

            // Load token file backup if exists
            $tokenFile = self::getStorageDir() . '/' . preg_replace('/[^a-zA-Z0-9_-]/', '', self::$token) . '.json';
            if (file_exists($tokenFile)) {
                $fileContent = @file_get_contents($tokenFile);
                $fileData = json_decode($fileContent, true);
                if (is_array($fileData)) {
                    self::$data = $fileData;
                    foreach ($fileData as $k => $v) {
                        $_SESSION[$k] = $v;
                    }
                }
            } else {
                self::$data = $_SESSION ?? [];
            }

            self::$started = true;
        }
    }

    public static function getToken(): string
    {
        self::start();
        return self::$token ?: '';
    }

    public static function set(string $key, mixed $value): void
    {
        self::start();
        $_SESSION[$key] = $value;
        self::$data[$key] = $value;

        // Persist token session to disk for guaranteed multi-environment persistence
        if (self::$token) {
            $tokenFile = self::getStorageDir() . '/' . preg_replace('/[^a-zA-Z0-9_-]/', '', self::$token) . '.json';
            @file_put_contents($tokenFile, json_encode(self::$data, JSON_UNESCAPED_UNICODE));
        }
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        self::start();
        return self::$data[$key] ?? $_SESSION[$key] ?? $default;
    }

    public static function has(string $key): bool
    {
        self::start();
        return isset(self::$data[$key]) || isset($_SESSION[$key]);
    }

    public static function remove(string $key): void
    {
        self::start();
        unset($_SESSION[$key]);
        unset(self::$data[$key]);

        if (self::$token) {
            $tokenFile = self::getStorageDir() . '/' . preg_replace('/[^a-zA-Z0-9_-]/', '', self::$token) . '.json';
            @file_put_contents($tokenFile, json_encode(self::$data, JSON_UNESCAPED_UNICODE));
        }
    }

    public static function destroy(): void
    {
        self::start();
        if (self::$token) {
            $tokenFile = self::getStorageDir() . '/' . preg_replace('/[^a-zA-Z0-9_-]/', '', self::$token) . '.json';
            if (file_exists($tokenFile)) {
                @unlink($tokenFile);
            }
        }
        self::$data = [];
        $_SESSION = [];
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            @setcookie(
                session_name(),
                '',
                time() - 42000,
                $params["path"],
                $params["domain"],
                $params["secure"],
                $params["httponly"]
            );
        }
        @session_destroy();
        self::$started = false;
        self::$token = null;
    }

    public static function getConnection(): ?array
    {
        return self::get('db_connection', null);
    }

    public static function setConnection(array $connection): void
    {
        self::set('db_connection', $connection);
    }

    public static function clearConnection(): void
    {
        self::remove('db_connection');
        self::remove('active_database');
    }

    public static function getActiveDatabase(): ?string
    {
        return self::get('active_database', null);
    }

    public static function setActiveDatabase(string $database): void
    {
        self::set('active_database', $database);
    }
}
