<?php
namespace App\Core;

class Session
{
    private static bool $started = false;

    public static function start(): void
    {
        if (!self::$started && session_status() === PHP_SESSION_NONE) {
            $config = require __DIR__ . '/../../config/app.php';

            // Detect HTTPS (including Cloudflare, Proxies, Load Balancers)
            $isHttps = (isset($_SERVER['HTTPS']) && ($_SERVER['HTTPS'] === 'on' || $_SERVER['HTTPS'] === 1)) 
                || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
                || (isset($_SERVER['HTTP_CF_VISITOR']) && str_contains($_SERVER['HTTP_CF_VISITOR'], 'https'))
                || (isset($_SERVER['HTTP_X_FORWARDED_SSL']) && $_SERVER['HTTP_X_FORWARDED_SSL'] === 'on')
                || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);

            session_set_cookie_params([
                'lifetime' => (int)($config['session_lifetime'] ?? 86400 * 7),
                'path' => '/',
                'domain' => '',
                'secure' => $isHttps,
                'httponly' => true,
                'samesite' => $isHttps ? 'None' : 'Lax',
            ]);

            session_name($config['session_name'] ?? 'acore_db_studio_session');
            session_start();
            self::$started = true;
        }
    }

    public static function set(string $key, mixed $value): void
    {
        self::start();
        $_SESSION[$key] = $value;
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        self::start();
        return $_SESSION[$key] ?? $default;
    }

    public static function has(string $key): bool
    {
        self::start();
        return isset($_SESSION[$key]);
    }

    public static function remove(string $key): void
    {
        self::start();
        unset($_SESSION[$key]);
    }

    public static function destroy(): void
    {
        self::start();
        $_SESSION = [];
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params["path"],
                $params["domain"],
                $params["secure"],
                $params["httponly"]
            );
        }
        session_destroy();
        self::$started = false;
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
