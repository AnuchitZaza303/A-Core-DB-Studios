<?php
namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use Exception;

class ServerController
{
    public function status(): void
    {
        try {
            $rawStatus = Database::fetchAll("SHOW GLOBAL STATUS");
            $statusMap = [];
            foreach ($rawStatus as $row) {
                $statusMap[$row['Variable_name']] = $row['Value'];
            }

            $rawVars = Database::fetchAll("SHOW GLOBAL VARIABLES WHERE Variable_name IN ('version', 'version_comment', 'max_connections', 'character_set_server', 'collation_server', 'innodb_buffer_pool_size', 'table_open_cache', 'key_buffer_size')");
            $varMap = [];
            foreach ($rawVars as $row) {
                $varMap[$row['Variable_name']] = $row['Value'];
            }

            $maxConn = (int)($varMap['max_connections'] ?? 151);
            $threadsConn = (int)($statusMap['Threads_connected'] ?? 0);
            $connPercent = $maxConn > 0 ? round(($threadsConn / $maxConn) * 100, 1) : 0;

            $bufferTotalPages = (int)($statusMap['Innodb_buffer_pool_pages_total'] ?? 0);
            $bufferDataPages = (int)($statusMap['Innodb_buffer_pool_pages_data'] ?? 0);
            $bufferPoolSize = (int)($varMap['innodb_buffer_pool_size'] ?? ($bufferTotalPages * 16384));
            $bufferPercent = $bufferTotalPages > 0 ? round(($bufferDataPages / $bufferTotalPages) * 100, 1) : 0;
            $bufferUsedBytes = $bufferTotalPages > 0 ? (int)($bufferPoolSize * ($bufferPercent / 100)) : 0;

            $openTables = (int)($statusMap['Open_tables'] ?? 0);
            $tableCache = (int)($varMap['table_open_cache'] ?? 400);
            $tableCachePercent = $tableCache > 0 ? min(100, round(($openTables / $tableCache) * 100, 1)) : 0;

            Response::success([
                'uptime' => (int)($statusMap['Uptime'] ?? 0),
                'threads_connected' => $threadsConn,
                'threads_running' => (int)($statusMap['Threads_running'] ?? 0),
                'max_connections' => $maxConn,
                'connection_percent' => $connPercent,
                'max_used_connections' => (int)($statusMap['Max_used_connections'] ?? $threadsConn),
                'buffer_pool_size' => $bufferPoolSize,
                'buffer_used_bytes' => $bufferUsedBytes,
                'buffer_percent' => $bufferPercent,
                'open_tables' => $openTables,
                'table_open_cache' => $tableCache,
                'table_cache_percent' => $tableCachePercent,
                'questions' => (int)($statusMap['Questions'] ?? 0),
                'queries' => (int)($statusMap['Queries'] ?? 0),
                'bytes_received' => (int)($statusMap['Bytes_received'] ?? 0),
                'bytes_sent' => (int)($statusMap['Bytes_sent'] ?? 0),
                'slow_queries' => (int)($statusMap['Slow_queries'] ?? 0),
                'variables' => $varMap,
            ]);
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function processes(): void
    {
        try {
            $processes = [];
            try {
                // Query information_schema.PROCESSLIST which includes MariaDB PROGRESS column
                $processes = Database::fetchAll("
                    SELECT 
                        ID AS Id,
                        USER AS `User`,
                        HOST AS `Host`,
                        DB AS `db`,
                        COMMAND AS `Command`,
                        TIME AS `Time`,
                        STATE AS `State`,
                        INFO AS `Info`,
                        PROGRESS AS `Progress`
                    FROM information_schema.PROCESSLIST
                    ORDER BY TIME DESC, ID ASC
                ");
            } catch (Exception $e1) {
                // Fallback to standard SHOW FULL PROCESSLIST
                $processes = Database::fetchAll("SHOW FULL PROCESSLIST");
            }

            $normalized = [];
            foreach ($processes as $proc) {
                $item = [];
                $item['Id'] = $proc['Id'] ?? $proc['ID'] ?? $proc['id'] ?? 0;
                $item['User'] = $proc['User'] ?? $proc['USER'] ?? $proc['user'] ?? '';
                $item['Host'] = $proc['Host'] ?? $proc['HOST'] ?? $proc['host'] ?? '';
                $item['db'] = $proc['db'] ?? $proc['Db'] ?? $proc['DB'] ?? null;
                $item['Command'] = $proc['Command'] ?? $proc['COMMAND'] ?? $proc['command'] ?? '';
                $item['Time'] = $proc['Time'] ?? $proc['TIME'] ?? $proc['time'] ?? 0;
                $item['State'] = $proc['State'] ?? $proc['STATE'] ?? $proc['state'] ?? '';
                $item['Info'] = $proc['Info'] ?? $proc['INFO'] ?? $proc['info'] ?? '';
                
                $rawProgress = $proc['Progress'] ?? $proc['PROGRESS'] ?? $proc['progress'] ?? null;
                $item['Progress'] = ($rawProgress !== null && $rawProgress !== '') ? round((float)$rawProgress, 1) : null;

                $normalized[] = $item;
            }

            Response::success($normalized);
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function killProcess(Request $request): void
    {
        $id = (int)$request->post('id', 0);
        if ($id <= 0) {
            Response::error('Process ID ไม่ถูกต้อง');
            return;
        }

        try {
            Database::execute("KILL {$id}");
            Response::success(null, "ยุติ Process ID #{$id} เรียบร้อย");
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function variables(Request $request): void
    {
        $search = trim($request->get('search', ''));
        try {
            if (!empty($search)) {
                $variables = Database::fetchAll("SHOW VARIABLES LIKE :search", ['search' => "%{$search}%"]);
            } else {
                $variables = Database::fetchAll("SHOW VARIABLES");
            }
            Response::success($variables);
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function engines(): void
    {
        try {
            $engines = Database::fetchAll("SHOW ENGINES");
            Response::success($engines);
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }
}
