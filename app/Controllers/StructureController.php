<?php
namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Services\SchemaService;
use Exception;

class StructureController
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

    public function getColumns(Request $request): void
    {
        try {
            $database = $this->getTargetDb($request->get('database'));
            $table = trim($request->get('table', ''));

            if (empty($table)) {
                Response::error('กรุณาระบุชื่อตาราง');
                return;
            }

            $columns = $this->schemaService->getTableColumns($database, $table);
            Response::success($columns);
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function addColumn(Request $request): void
    {
        try {
            $database = $this->getTargetDb($request->post('database'));
            $table = trim($request->post('table', ''));
            $column = $request->post('column', []);
            $after = $request->post('after', null);

            if (empty($table) || empty($column['name']) || empty($column['type'])) {
                Response::error('ข้อมูลคอลัมน์ไม่ถูกต้อง');
                return;
            }

            $this->schemaService->addColumn($database, $table, $column, $after);
            Response::success(null, "เพิ่มคอลัมน์ `{$column['name']}` ในตาราง `{$table}` สำเร็จ");
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function modifyColumn(Request $request): void
    {
        try {
            $database = $this->getTargetDb($request->post('database'));
            $table = trim($request->post('table', ''));
            $oldColName = trim($request->post('old_column', ''));
            $column = $request->post('column', []);

            if (empty($table) || empty($oldColName) || empty($column['name']) || empty($column['type'])) {
                Response::error('ข้อมูลคอลัมน์ไม่ถูกต้อง');
                return;
            }

            $this->schemaService->modifyColumn($database, $table, $oldColName, $column);
            Response::success(null, "แก้ไขคอลัมน์ `{$oldColName}` สำเร็จ");
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function dropColumn(Request $request): void
    {
        try {
            $database = $this->getTargetDb($request->post('database') ?: $request->get('database'));
            $table = trim($request->post('table', '') ?: $request->get('table', ''));
            $column = trim($request->post('column', '') ?: $request->get('column', ''));

            if (empty($table) || empty($column)) {
                Response::error('ข้อมูลไม่ครบถ้วน');
                return;
            }

            $this->schemaService->dropColumn($database, $table, $column);
            Response::success(null, "ลบคอลัมน์ `{$column}` สำเร็จ");
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function getIndexes(Request $request): void
    {
        try {
            $database = $this->getTargetDb($request->get('database'));
            $table = trim($request->get('table', ''));

            if (empty($table)) {
                Response::error('กรุณาระบุชื่อตาราง');
                return;
            }

            $indexes = $this->schemaService->getTableIndexes($database, $table);
            Response::success($indexes);
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function addIndex(Request $request): void
    {
        try {
            $database = $this->getTargetDb($request->post('database'));
            $table = trim($request->post('table', ''));
            $name = trim($request->post('name', ''));
            $type = trim($request->post('type', 'INDEX'));
            $columns = $request->post('columns', []);

            if (empty($table) || empty($columns)) {
                Response::error('กรุณาระบุตารางและคอลัมน์สำหรับ Index');
                return;
            }

            if (strtoupper($type) !== 'PRIMARY' && empty($name)) {
                Response::error('กรุณาระบุชื่อ Index');
                return;
            }

            $this->schemaService->addIndex($database, $table, $name, $type, $columns);
            Response::success(null, "สร้าง Index สำเร็จ");
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function dropIndex(Request $request): void
    {
        try {
            $database = $this->getTargetDb($request->post('database') ?: $request->get('database'));
            $table = trim($request->post('table', '') ?: $request->get('table', ''));
            $name = trim($request->post('name', '') ?: $request->get('name', ''));

            if (empty($table) || empty($name)) {
                Response::error('ข้อมูลไม่ครบถ้วน');
                return;
            }

            $this->schemaService->dropIndex($database, $table, $name);
            Response::success(null, "ลบ Index `{$name}` สำเร็จ");
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function getForeignKeys(Request $request): void
    {
        try {
            $database = $this->getTargetDb($request->get('database'));
            $table = trim($request->get('table', ''));

            if (empty($table)) {
                Response::error('กรุณาระบุชื่อตาราง');
                return;
            }

            $foreignKeys = $this->schemaService->getTableForeignKeys($database, $table);
            Response::success($foreignKeys);
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }
}
