<?php
namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use Exception;
use PDO;

class AuthController
{
    public function appStatus(): void
    {
        $config = require __DIR__ . '/../../config/app.php';
        $authRequired = !empty($config['auth_required']);
        $authenticated = $authRequired ? (Session::get('app_authenticated') === true) : true;

        Response::success([
            'auth_required' => $authRequired,
            'authenticated' => $authenticated,
            'username' => $authenticated ? Session::get('app_user', 'Admin') : null,
        ]);
    }

    public function appLogin(Request $request): void
    {
        $config = require __DIR__ . '/../../config/app.php';
        $username = trim((string)$request->post('username', ''));
        $password = (string)$request->post('password', '');

        $expectedUser = (string)($config['admin_username'] ?? 'admin');
        $expectedPass = (string)($config['admin_password'] ?? 'admin1234');

        if ($username !== $expectedUser || $password !== $expectedPass) {
            Response::error('ชื่อผู้ใช้หรือรหัสผ่านระบบไม่ถูกต้อง', 401);
            return;
        }

        Session::set('app_authenticated', true);
        Session::set('app_user', $username);

        // Auto-connect to database if enabled
        if (!empty($config['auto_connect_db']) && !Database::isConnected()) {
            $defaultConn = [
                'host' => $config['default_host'] ?? '127.0.0.1',
                'port' => (int)($config['default_port'] ?? 3306),
                'user' => $config['default_user'] ?? 'root',
                'password' => $config['default_password'] ?? '',
                'charset' => 'utf8mb4',
            ];
            try {
                Database::connect($defaultConn);
                Session::setConnection($defaultConn);
            } catch (\Exception $e) {
                // If auto-connect fails, the user will see the connection modal to enter credentials manually
            }
        }

        Response::success([
            'authenticated' => true,
            'username' => $username,
            'db_connected' => Database::isConnected(),
        ], 'เข้าสู่ระบบ A-Core Studio สำเร็จ');
    }

    public function appLogout(): void
    {
        Session::remove('app_authenticated');
        Session::remove('app_user');
        Session::clearConnection();
        Response::success(null, 'ออกจากระบบ A-Core Studio เรียบร้อย');
    }

    public function connect(Request $request): void
    {
        $host = $request->post('host', '127.0.0.1');
        $port = (int)$request->post('port', 3306);
        $user = $request->post('user', 'root');
        $password = $request->post('password', '');
        $database = $request->post('database', null);
        $saveProfile = $request->post('save_profile', false);
        $profileName = $request->post('profile_name', '');

        $connection = [
            'host' => $host,
            'port' => $port,
            'user' => $user,
            'password' => $password,
            'charset' => 'utf8mb4'
        ];

        try {
            // Test connection
            $pdo = Database::connect($connection, $database ?: null);
            $versionStmt = $pdo->query("SELECT VERSION() AS version, USER() AS user, DATABASE() AS db");
            $info = $versionStmt->fetch(PDO::FETCH_ASSOC);

            // Save in session
            Session::setConnection($connection);
            if ($database) {
                Session::setActiveDatabase($database);
            }

            // Save profile if requested
            if ($saveProfile && !empty($profileName)) {
                $this->storeProfile($profileName, $connection);
            }

            Response::success([
                'connected' => true,
                'server_version' => $info['version'] ?? 'Unknown',
                'user' => $info['user'] ?? $user,
                'active_database' => $database,
                'host' => $host,
                'port' => $port,
            ], 'เชื่อมต่อฐานข้อมูลสำเร็จ');
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    public function status(): void
    {
        if (!Database::isConnected()) {
            Response::json([
                'connected' => false,
                'server_version' => null,
                'active_database' => null,
            ], 200);
            return;
        }

        try {
            $pdo = Database::getPDO();
            $versionStmt = $pdo->query("SELECT VERSION() AS version, USER() AS user");
            $info = $versionStmt->fetch(PDO::FETCH_ASSOC);

            $connection = Session::getConnection();

            Response::success([
                'connected' => true,
                'server_version' => $info['version'] ?? 'Unknown',
                'user' => $info['user'] ?? ($connection['user'] ?? 'root'),
                'host' => $connection['host'] ?? '127.0.0.1',
                'port' => $connection['port'] ?? 3306,
                'active_database' => Session::getActiveDatabase(),
            ]);
        } catch (Exception $e) {
            Session::clearConnection();
            Response::json([
                'connected' => false,
                'error' => $e->getMessage()
            ], 200);
        }
    }

    public function disconnect(): void
    {
        Session::clearConnection();
        Response::success(null, 'ออกจากระบบเรียบร้อย');
    }

    public function getProfiles(): void
    {
        $profiles = Session::get('saved_profiles', [
            [
                'name' => 'Localhost (XAMPP Default)',
                'host' => '127.0.0.1',
                'port' => 3306,
                'user' => 'root',
                'password' => '',
                'database' => '',
            ]
        ]);

        Response::success($profiles);
    }

    public function saveProfile(Request $request): void
    {
        $name = trim($request->post('name', ''));
        $host = $request->post('host', '127.0.0.1');
        $port = (int)$request->post('port', 3306);
        $user = $request->post('user', 'root');
        $password = $request->post('password', '');
        $database = $request->post('database', '');

        if (empty($name)) {
            Response::error('กรุณาระบุชื่อโปรไฟล์');
        }

        $this->storeProfile($name, [
            'name' => $name,
            'host' => $host,
            'port' => $port,
            'user' => $user,
            'password' => $password,
            'database' => $database,
        ]);

        Response::success(null, 'บันทึกโปรไฟล์เรียบร้อย');
    }

    public function deleteProfile(Request $request): void
    {
        $name = $request->get('name');
        $profiles = Session::get('saved_profiles', []);

        $filtered = array_values(array_filter($profiles, fn($p) => ($p['name'] ?? '') !== $name));
        Session::set('saved_profiles', $filtered);

        Response::success($filtered, 'ลบโปรไฟล์เรียบร้อย');
    }

    private function storeProfile(string $name, array $profileData): void
    {
        $profiles = Session::get('saved_profiles', []);
        $found = false;

        $profileData['name'] = $name;

        foreach ($profiles as &$p) {
            if ($p['name'] === $name) {
                $p = $profileData;
                $found = true;
                break;
            }
        }

        if (!$found) {
            $profiles[] = $profileData;
        }

        Session::set('saved_profiles', $profiles);
    }
}
