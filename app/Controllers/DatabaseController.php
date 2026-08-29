<?php
namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Services\SchemaService;
use Exception;

class DatabaseController
{
    private SchemaService $schemaService;

    public function __construct()
    {
        $this->schemaService = new SchemaService();
    }

    public function index(Request $request): void
    {
        $includeSystem = $request->get('include_system', '0') === '1';
        try {
            $databases = $includeSystem 
                ? $this->schemaService->getAllDatabasesWithSystem()
                : $this->schemaService->getDatabases();

            Response::success([
                'databases' => $databases,
                'active' => Session::getActiveDatabase(),
            ]);
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function create(Request $request): void
    {
        $name = trim($request->post('name', ''));
        $charset = $request->post('charset', 'utf8mb4');
        $collation = $request->post('collation', 'utf8mb4_unicode_ci');

        if (empty($name)) {
            Response::error('กรุณาระบุชื่อฐานข้อมูล');
            return;
        }

        try {
            $this->schemaService->createDatabase($name, $charset, $collation);
            Session::setActiveDatabase($name);
            Response::success(['database' => $name], "สร้างฐานข้อมูล `{$name}` สำเร็จ");
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function drop(Request $request): void
    {
        $name = trim($request->post('name', '') ?: $request->get('name', ''));

        if (empty($name)) {
            Response::error('กรุณาระบุชื่อฐานข้อมูลที่ต้องการลบ');
            return;
        }

        try {
            $this->schemaService->dropDatabase($name);
            if (Session::getActiveDatabase() === $name) {
                Session::setActiveDatabase('');
            }
            Response::success(null, "ลบฐานข้อมูล `{$name}` สำเร็จ");
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function select(Request $request): void
    {
        $name = trim($request->post('name', ''));

        if (empty($name)) {
            Response::error('กรุณาระบุชื่อฐานข้อมูล');
            return;
        }

        try {
            Database::selectDatabase($name);
            Response::success(['active' => $name], "เลือกฐานข้อมูล `{$name}` แล้ว");
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function collations(): void
    {
        try {
            $collations = $this->schemaService->getCollations();
            $engines = $this->schemaService->getEngines();

            Response::success([
                'collations' => $collations,
                'engines' => $engines,
            ]);
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }
}
