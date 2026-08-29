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

            $rawVars = Database::fetchAll("SHOW GLOBAL VARIABLES WHERE Variable_name IN ('version', 'version_comment', 'max_connections', 'character_set_server', 'collation_server', 'innodb_buffer_pool_size')");
            $varMap = [];
            foreach ($rawVars as $row) {
                $varMap[$row['Variable_name']] = $row['Value'];
            }

            Response::success([
                'uptime' => (int)($statusMap['Uptime'] ?? 0),
                'threads_connected' => (int)($statusMap['Threads_connected'] ?? 0),
                'threads_running' => (int)($statusMap['Threads_running'] ?? 0),
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
            $processes = Database::fetchAll("SHOW FULL PROCESSLIST");
            Response::success($processes);
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
