<?php
namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Services\ExportService;
use Exception;

class ExportImportController
{
    private ExportService $exportService;

    public function __construct()
    {
        $this->exportService = new ExportService();
    }

    public function exportDump(Request $request): void
    {
        $database = $request->get('database', Session::getActiveDatabase());
        $tablesRaw = $request->get('tables', '');
        $tables = !empty($tablesRaw) ? explode(',', $tablesRaw) : [];
        $includeStructure = $request->get('structure', '1') === '1';
        $includeData = $request->get('data', '1') === '1';
        $dropTable = $request->get('drop_table', '1') === '1';

        if (empty($database)) {
            Response::error('ยังไม่ได้ระบุฐานข้อมูล');
            return;
        }

        try {
            $dump = $this->exportService->generateSqlDump($database, $tables, $includeStructure, $includeData, $dropTable);
            $filename = "{$database}_dump_" . date('Ymd_His') . ".sql";
            Response::download($filename, $dump, 'application/sql');
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function exportTableData(Request $request): void
    {
        $database = $request->get('database', Session::getActiveDatabase());
        $table = $request->get('table', '');
        $format = strtolower($request->get('format', 'csv'));

        if (empty($database) || empty($table)) {
            Response::error('ข้อมูลไม่ครบถ้วน');
            return;
        }

        try {
            if ($format === 'json') {
                $content = $this->exportService->generateJson($database, $table);
                $filename = "{$database}_{$table}_" . date('Ymd_His') . ".json";
                Response::download($filename, $content, 'application/json');
            } else {
                $content = $this->exportService->generateCsv($database, $table);
                $filename = "{$database}_{$table}_" . date('Ymd_His') . ".csv";
                Response::download($filename, $content, 'text/csv');
            }
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function importSql(Request $request): void
    {
        $database = $request->post('database', Session::getActiveDatabase());
        
        if (empty($database)) {
            Response::error('ยังไม่ได้ระบุฐานข้อมูล');
            return;
        }

        $sqlContent = '';

        // Check if uploaded file
        $file = $request->getFile('file');
        if ($file && isset($file['tmp_name']) && is_uploaded_file($file['tmp_name'])) {
            $sqlContent = file_get_contents($file['tmp_name']);
        } else {
            $sqlContent = $request->post('sql', '');
        }

        if (empty(trim($sqlContent))) {
            Response::error('ไม่พบคำสั่ง SQL หรือไฟล์ที่อัปโหลด');
            return;
        }

        try {
            $result = $this->exportService->importSql($database, $sqlContent);
            Response::success($result, "นำเข้าข้อมูลสำเร็จ ({$result['executed']}/{$result['total_statements']} คำสั่ง)");
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }
}
