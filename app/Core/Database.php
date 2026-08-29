<?php
namespace App\Core;

use PDO;
use PDOException;
use Exception;

class Database
{
    private static ?PDO $pdo = null;
    private static ?string $currentDatabase = null;

    public static function connect(array $config, ?string $database = null): PDO
    {
        $host = $config['host'] ?? '127.0.0.1';
        $port = $config['port'] ?? 3306;
        $user = $config['user'] ?? 'root';
        $password = $config['password'] ?? 'gr@eqVG6H&';
        $charset = $config['charset'] ?? 'utf8mb4';
        
        $dbConfig = require __DIR__ . '/../../config/database.php';
        $options = $dbConfig['options'] ?? [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];

        $dsn = "mysql:host={$host};port={$port};charset={$charset}";
        if ($database) {
            $dsn .= ";dbname={$database}";
        }

        try {
            $pdo = new PDO($dsn, $user, $password, $options);
            self::$pdo = $pdo;
            self::$currentDatabase = $database;
            return $pdo;
        } catch (PDOException $e) {
            // Smart Loopback Fallback (127.0.0.1 <-> localhost)
            $altHost = ($host === '127.0.0.1') ? 'localhost' : (($host === 'localhost') ? '127.0.0.1' : null);
            if ($altHost !== null) {
                try {
                    $altDsn = "mysql:host={$altHost};port={$port};charset={$charset}" . ($database ? ";dbname={$database}" : "");
                    $pdo = new PDO($altDsn, $user, $password, $options);
                    self::$pdo = $pdo;
                    self::$currentDatabase = $database;
                    return $pdo;
                } catch (PDOException $altEx) {
                    // Ignore and throw original error
                }
            }
            throw new Exception("ไม่สามารถเชื่อมต่อฐานข้อมูลได้: " . $e->getMessage(), (int)$e->getCode());
        }
    }

    public static function getPDO(?string $database = null): PDO
    {
        $sessionConn = Session::getConnection();
        if (!$sessionConn) {
            throw new Exception("ยังไม่ได้เชื่อมต่อฐานข้อมูล กรุณาเข้าสู่ระบบก่อน", 401);
        }

        $targetDb = $database ?? Session::getActiveDatabase();

        // If already connected to the requested DB, reuse connection
        if (self::$pdo !== null && self::$currentDatabase === $targetDb) {
            return self::$pdo;
        }

        self::$pdo = self::connect($sessionConn, $targetDb);
        return self::$pdo;
    }

    public static function selectDatabase(string $database): void
    {
        $pdo = self::getPDO();
        $pdo->exec("USE `" . str_replace("`", "``", $database) . "`");
        self::$currentDatabase = $database;
        Session::setActiveDatabase($database);
    }

    public static function query(string $sql, array $params = [], ?string $database = null): \PDOStatement
    {
        $pdo = self::getPDO($database);
        if (empty($params)) {
            return $pdo->query($sql);
        }
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    public static function fetchAll(string $sql, array $params = [], ?string $database = null): array
    {
        $stmt = self::query($sql, $params, $database);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public static function fetchOne(string $sql, array $params = [], ?string $database = null): ?array
    {
        $stmt = self::query($sql, $params, $database);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result === false ? null : $result;
    }

    public static function execute(string $sql, array $params = [], ?string $database = null): int
    {
        $pdo = self::getPDO($database);
        if (empty($params)) {
            return $pdo->exec($sql);
        }
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    public static function lastInsertId(): string|false
    {
        return self::$pdo ? self::$pdo->lastInsertId() : false;
    }

    public static function isConnected(): bool
    {
        return Session::getConnection() !== null;
    }
}
