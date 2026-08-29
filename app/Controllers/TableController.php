<?php
namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Services\SchemaService;
use Exception;
use PDO;

class TableController
{
    private SchemaService $schemaService;

    public function __construct()
    {
        $this->schemaService = new SchemaService();
    }

    private function getTargetDb(?string $db = null): string
    {
        $database = $db ?: Session::getActiveDatabase();
        if (empty($database)) {
            throw new Exception('ยังไม่ได้เลือกฐานข้อมูล', 400);
        }
        return $database;
    }

    public function index(Request $request): void
    {
        try {
            $database = $this->getTargetDb($request->get('database'));
            $tables = $this->schemaService->getTables($database);

            Response::success([
                'database' => $database,
                'tables' => $tables,
            ]);
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function create(Request $request): void
    {
        try {
            $database = $this->getTargetDb($request->post('database'));
            $tableName = trim($request->post('name', ''));
            $columns = $request->post('columns', []);
            $engine = $request->post('engine', 'InnoDB');
            $collation = $request->post('collation', 'utf8mb4_unicode_ci');

            if (empty($tableName)) {
                Response::error('กรุณาระบุชื่อตาราง');
                return;
            }

            $this->schemaService->createTable($database, $tableName, $columns, $engine, $collation);
            Response::success(['table' => $tableName], "สร้างตาราง `{$tableName}` สำเร็จ");
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function drop(Request $request): void
    {
        try {
            $database = $this->getTargetDb($request->post('database') ?: $request->get('database'));
            $table = trim($request->post('table', '') ?: $request->get('table', ''));

            if (empty($table)) {
                Response::error('กรุณาระบุชื่อตารางที่ต้องการลบ');
                return;
            }

            $this->schemaService->dropTable($database, $table);
            Response::success(null, "ลบตาราง `{$table}` สำเร็จ");
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function truncate(Request $request): void
    {
        try {
            $database = $this->getTargetDb($request->post('database'));
            $table = trim($request->post('table', ''));

            if (empty($table)) {
                Response::error('กรุณาระบุชื่อตาราง');
                return;
            }

            $this->schemaService->truncateTable($database, $table);
            Response::success(null, "ล้างข้อมูลในตาราง `{$table}` (Truncate) เรียบร้อย");
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function rename(Request $request): void
    {
        try {
            $database = $this->getTargetDb($request->post('database'));
            $oldName = trim($request->post('old_name', ''));
            $newName = trim($request->post('new_name', ''));

            if (empty($oldName) || empty($newName)) {
                Response::error('กรุณาระบุชื่อตารางเดิมและชื่อตารางใหม่');
                return;
            }

            $this->schemaService->renameTable($database, $oldName, $newName);
            Response::success(null, "เปลี่ยนชื่อตารางจาก `{$oldName}` เป็น `{$newName}` สำเร็จ");
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function getRows(Request $request): void
    {
        try {
            $database = $this->getTargetDb($request->get('database'));
            $table = trim($request->get('table', ''));
            $page = max(1, (int)$request->get('page', 1));
            $limit = max(1, min(500, (int)$request->get('limit', 25)));
            $offset = ($page - 1) * $limit;
            $sortCol = $request->get('sort');
            $sortDir = strtoupper($request->get('dir', 'ASC')) === 'DESC' ? 'DESC' : 'ASC';
            $search = trim($request->get('search', ''));
            $whereClause = trim($request->get('where', ''));

            if (empty($table)) {
                Response::error('กรุณาระบุชื่อตาราง');
                return;
            }

            $columns = $this->schemaService->getTableColumns($database, $table);
            $columnNames = array_column($columns, 'name');
            $primaryKeys = array_column(array_filter($columns, fn($c) => $c['column_key'] === 'PRI'), 'name');

            $escapedDb = str_replace("`", "``", $database);
            $escapedTable = str_replace("`", "``", $table);

            $conditions = [];
            $params = [];

            // Global search across text/varchar columns
            if (!empty($search)) {
                $searchOr = [];
                foreach ($columns as $idx => $col) {
                    $searchParam = ":search_{$idx}";
                    $searchOr[] = "`" . str_replace("`", "``", $col['name']) . "` LIKE {$searchParam}";
                    $params["search_{$idx}"] = "%{$search}%";
                }
                if (!empty($searchOr)) {
                    $conditions[] = "(" . implode(" OR ", $searchOr) . ")";
                }
            }

            // Custom WHERE clause if passed
            if (!empty($whereClause)) {
                $conditions[] = "({$whereClause})";
            }

            $whereSql = !empty($conditions) ? " WHERE " . implode(" AND ", $conditions) : "";

            // Total count
            $countSql = "SELECT COUNT(*) AS total FROM `{$escapedDb}`.`{$escapedTable}`{$whereSql}";
            $countResult = Database::fetchOne($countSql, $params, $database);
            $totalRows = (int)($countResult['total'] ?? 0);

            // Sorting
            $orderSql = "";
            if (!empty($sortCol) && in_array($sortCol, $columnNames)) {
                $orderSql = " ORDER BY `" . str_replace("`", "``", $sortCol) . "` {$sortDir}";
            } elseif (!empty($primaryKeys)) {
                $orderSql = " ORDER BY `" . str_replace("`", "``", $primaryKeys[0]) . "` ASC";
            }

            // Data Query
            $dataSql = "SELECT * FROM `{$escapedDb}`.`{$escapedTable}`{$whereSql}{$orderSql} LIMIT {$limit} OFFSET {$offset}";
            $rows = Database::fetchAll($dataSql, $params, $database);

            $totalPages = ceil($totalRows / $limit);

            Response::success([
                'database' => $database,
                'table' => $table,
                'columns' => $columns,
                'primary_keys' => $primaryKeys,
                'rows' => $rows,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total_rows' => $totalRows,
                    'total_pages' => $totalPages,
                ],
            ]);
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function insertRow(Request $request): void
    {
        try {
            $database = $this->getTargetDb($request->post('database'));
            $table = trim($request->post('table', ''));
            $data = $request->post('data', []);

            if (empty($table) || empty($data)) {
                Response::error('ข้อมูลไม่ครบถ้วน');
                return;
            }

            $columns = $this->schemaService->getTableColumns($database, $table);
            $colsMap = [];
            foreach ($columns as $c) {
                $colsMap[$c['name']] = $c;
            }

            $insertCols = [];
            $placeholders = [];
            $params = [];

            foreach ($data as $colName => $value) {
                if (!isset($colsMap[$colName])) continue;
                $colInfo = $colsMap[$colName];

                // Skip auto increment if empty/null
                if (str_contains($colInfo['extra'] ?? '', 'auto_increment') && ($value === '' || $value === null)) {
                    continue;
                }

                $insertCols[] = "`" . str_replace("`", "``", $colName) . "`";
                $paramKey = ":col_" . preg_replace('/[^a-zA-Z0-9_]/', '', $colName);
                $placeholders[] = $paramKey;

                if ($value === 'NULL' || $value === null) {
                    $params[$paramKey] = null;
                } else {
                    $params[$paramKey] = $value;
                }
            }

            $escapedDb = str_replace("`", "``", $database);
            $escapedTable = str_replace("`", "``", $table);

            $sql = "INSERT INTO `{$escapedDb}`.`{$escapedTable}` (" . implode(', ', $insertCols) . ") VALUES (" . implode(', ', $placeholders) . ")";
            
            $pdo = Database::getPDO($database);
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            Response::success([
                'last_insert_id' => $pdo->lastInsertId(),
                'affected_rows' => $stmt->rowCount(),
            ], 'เพิ่มข้อมูลแถวใหม่สำเร็จ');
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function updateRow(Request $request): void
    {
        try {
            $database = $this->getTargetDb($request->post('database'));
            $table = trim($request->post('table', ''));
            $primaryKeyValues = $request->post('primary_keys', []);
            $changes = $request->post('changes', []);

            if (empty($table) || empty($primaryKeyValues) || empty($changes)) {
                Response::error('ข้อมูลสำหรับการแก้ไขไม่ครบถ้วน');
                return;
            }

            $setClauses = [];
            $whereClauses = [];
            $params = [];

            foreach ($changes as $col => $val) {
                $pKey = ":set_" . preg_replace('/[^a-zA-Z0-9_]/', '', $col);
                $setClauses[] = "`" . str_replace("`", "``", $col) . "` = {$pKey}";
                $params[$pKey] = ($val === null || $val === 'NULL') ? null : $val;
            }

            foreach ($primaryKeyValues as $col => $val) {
                $pKey = ":where_" . preg_replace('/[^a-zA-Z0-9_]/', '', $col);
                if ($val === null) {
                    $whereClauses[] = "`" . str_replace("`", "``", $col) . "` IS NULL";
                } else {
                    $whereClauses[] = "`" . str_replace("`", "``", $col) . "` = {$pKey}";
                    $params[$pKey] = $val;
                }
            }

            $escapedDb = str_replace("`", "``", $database);
            $escapedTable = str_replace("`", "``", $table);

            $sql = "UPDATE `{$escapedDb}`.`{$escapedTable}` SET " . implode(', ', $setClauses) . " WHERE " . implode(' AND ', $whereClauses) . " LIMIT 1";

            $pdo = Database::getPDO($database);
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            Response::success([
                'affected_rows' => $stmt->rowCount(),
            ], 'อัปเดตข้อมูลสำเร็จ');
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function deleteRow(Request $request): void
    {
        try {
            $database = $this->getTargetDb($request->post('database') ?: $request->get('database'));
            $table = trim($request->post('table', '') ?: $request->get('table', ''));
            $primaryKeyValues = $request->post('primary_keys', []);

            if (empty($table) || empty($primaryKeyValues)) {
                Response::error('ข้อมูลสำหรับการลบไม่ครบถ้วน');
                return;
            }

            $whereClauses = [];
            $params = [];

            foreach ($primaryKeyValues as $col => $val) {
                $pKey = ":where_" . preg_replace('/[^a-zA-Z0-9_]/', '', $col);
                if ($val === null) {
                    $whereClauses[] = "`" . str_replace("`", "``", $col) . "` IS NULL";
                } else {
                    $whereClauses[] = "`" . str_replace("`", "``", $col) . "` = {$pKey}";
                    $params[$pKey] = $val;
                }
            }

            $escapedDb = str_replace("`", "``", $database);
            $escapedTable = str_replace("`", "``", $table);

            $sql = "DELETE FROM `{$escapedDb}`.`{$escapedTable}` WHERE " . implode(' AND ', $whereClauses) . " LIMIT 1";

            $pdo = Database::getPDO($database);
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            Response::success([
                'affected_rows' => $stmt->rowCount(),
            ], 'ลบข้อมูลสำเร็จ');
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function bulkDeleteRows(Request $request): void
    {
        try {
            $database = $this->getTargetDb($request->post('database'));
            $table = trim($request->post('table', ''));
            $rowsKeys = $request->post('rows_keys', []); // Array of primary key maps

            if (empty($table) || empty($rowsKeys)) {
                Response::error('ไม่ได้เลือกแถวข้อมูลที่ต้องการลบ');
                return;
            }

            $deletedCount = 0;
            $pdo = Database::getPDO($database);
            $pdo->beginTransaction();

            $escapedDb = str_replace("`", "``", $database);
            $escapedTable = str_replace("`", "``", $table);

            foreach ($rowsKeys as $idx => $pkMap) {
                $whereClauses = [];
                $params = [];

                foreach ($pkMap as $col => $val) {
                    $pKey = ":where_{$idx}_" . preg_replace('/[^a-zA-Z0-9_]/', '', $col);
                    if ($val === null) {
                        $whereClauses[] = "`" . str_replace("`", "``", $col) . "` IS NULL";
                    } else {
                        $whereClauses[] = "`" . str_replace("`", "``", $col) . "` = {$pKey}";
                        $params[$pKey] = $val;
                    }
                }

                $sql = "DELETE FROM `{$escapedDb}`.`{$escapedTable}` WHERE " . implode(' AND ', $whereClauses) . " LIMIT 1";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                $deletedCount += $stmt->rowCount();
            }

            $pdo->commit();
            Response::success(['deleted_count' => $deletedCount], "ลบข้อมูลจำนวน {$deletedCount} แถวสำเร็จ");
        } catch (Exception $e) {
            if (isset($pdo) && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            Response::error($e->getMessage());
        }
    }
}
