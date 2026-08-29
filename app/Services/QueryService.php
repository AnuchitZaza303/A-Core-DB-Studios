<?php
namespace App\Services;

use App\Core\Database;
use App\Core\Session;
use Exception;
use PDO;

class QueryService
{
    public function executeQuery(string $sql, ?string $database = null): array
    {
        $sql = trim($sql);
        if (empty($sql)) {
            throw new Exception("คำสั่ง SQL ว่างเปล่า");
        }

        $startTime = microtime(true);
        $pdo = Database::getPDO($database);

        $this->logQuery($sql);

        // Check if query is a SELECT/SHOW/DESCRIBE/EXPLAIN or a modifying statement
        $firstWord = strtoupper(strtok($sql, " \t\n\r"));

        $isSelect = in_array($firstWord, ['SELECT', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN', 'CHECK', 'ANALYZE']);

        try {
            if ($isSelect) {
                $stmt = $pdo->query($sql);
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $columnCount = $stmt->columnCount();
                $columns = [];
                
                for ($i = 0; $i < $columnCount; $i++) {
                    $meta = $stmt->getColumnMeta($i);
                    $columns[] = [
                        'name' => $meta['name'] ?? "col_{$i}",
                        'type' => $meta['native_type'] ?? 'unknown',
                        'table' => $meta['table'] ?? '',
                    ];
                }

                $endTime = microtime(true);
                $duration = round(($endTime - $startTime) * 1000, 2);

                return [
                    'type' => 'select',
                    'columns' => $columns,
                    'rows' => $rows,
                    'total_rows' => count($rows),
                    'duration_ms' => $duration,
                    'sql' => $sql,
                ];
            } else {
                $affectedRows = $pdo->exec($sql);
                $endTime = microtime(true);
                $duration = round(($endTime - $startTime) * 1000, 2);

                return [
                    'type' => 'exec',
                    'affected_rows' => $affectedRows,
                    'duration_ms' => $duration,
                    'sql' => $sql,
                    'message' => "ดำเนินการสำเร็จ มีผลกระทบ {$affectedRows} แถว",
                ];
            }
        } catch (Exception $e) {
            $endTime = microtime(true);
            $duration = round(($endTime - $startTime) * 1000, 2);
            throw new Exception("เกิดข้อผิดพลาด SQL ({$duration} ms): " . $e->getMessage());
        }
    }

    public function explainQuery(string $sql, ?string $database = null): array
    {
        $sql = trim($sql);
        $explainSql = "EXPLAIN " . $sql;
        return $this->executeQuery($explainSql, $database);
    }

    public function getHistory(): array
    {
        return Session::get('query_history', []);
    }

    public function clearHistory(): void
    {
        Session::set('query_history', []);
    }

    private function logQuery(string $sql): void
    {
        $history = Session::get('query_history', []);
        
        array_unshift($history, [
            'id' => uniqid(),
            'sql' => $sql,
            'time' => date('Y-m-d H:i:s'),
            'database' => Session::getActiveDatabase(),
        ]);

        // Keep last 50 queries
        if (count($history) > 50) {
            $history = array_slice($history, 0, 50);
        }

        Session::set('query_history', $history);
    }
}
