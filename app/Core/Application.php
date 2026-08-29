<?php
namespace App\Core;

use App\Controllers\AuthController;
use App\Controllers\DatabaseController;
use App\Controllers\TableController;
use App\Controllers\StructureController;
use App\Controllers\QueryController;
use App\Controllers\ExportImportController;
use App\Controllers\ServerController;
use Throwable;

class Application
{
    private Router $router;
    private Request $request;

    public function __construct()
    {
        if (!headers_sent()) {
            header('X-Frame-Options: SAMEORIGIN');
            header('X-Content-Type-Options: nosniff');
            header('X-XSS-Protection: 1; mode=block');
            header('Referrer-Policy: strict-origin-when-cross-origin');
        }

        Session::start();
        $this->router = new Router();
        $this->request = new Request();
        $this->registerRoutes();
    }

    public static function autoload(): void
    {
        spl_autoload_register(function ($class) {
            $prefix = 'App\\';
            $baseDir = dirname(__DIR__) . '/';

            $len = strlen($prefix);
            if (strncmp($prefix, $class, $len) !== 0) {
                return;
            }

            $relativeClass = substr($class, $len);
            $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';

            if (file_exists($file)) {
                require $file;
            }
        });
    }

    private function requireAuth(): void
    {
        if (!Database::isConnected()) {
            Response::error('ยังไม่ได้เชื่อมต่อฐานข้อมูล กรุณาเข้าสู่ระบบก่อน', 401);
        }
    }

    private function registerRoutes(): void
    {
        $authCheck = [$this, 'requireAuthMiddleware'];

        // Web UI
        $this->router->get('/', function () {
            require_once __DIR__ . '/../../views/app.php';
        });

        // Auth & Connection API
        $this->router->post('/api/auth/connect', [AuthController::class, 'connect']);
        $this->router->get('/api/auth/status', [AuthController::class, 'status']);
        $this->router->post('/api/auth/disconnect', [AuthController::class, 'disconnect']);
        $this->router->get('/api/auth/profiles', [AuthController::class, 'getProfiles']);
        $this->router->post('/api/auth/profiles', [AuthController::class, 'saveProfile']);
        $this->router->delete('/api/auth/profiles', [AuthController::class, 'deleteProfile']);

        // Database API
        $this->router->get('/api/databases', [DatabaseController::class, 'index'], [$authCheck]);
        $this->router->post('/api/databases', [DatabaseController::class, 'create'], [$authCheck]);
        $this->router->delete('/api/databases', [DatabaseController::class, 'drop'], [$authCheck]);
        $this->router->post('/api/databases/select', [DatabaseController::class, 'select'], [$authCheck]);
        $this->router->get('/api/databases/collations', [DatabaseController::class, 'collations'], [$authCheck]);

        // Table & Data API
        $this->router->get('/api/tables', [TableController::class, 'index'], [$authCheck]);
        $this->router->post('/api/tables', [TableController::class, 'create'], [$authCheck]);
        $this->router->delete('/api/tables', [TableController::class, 'drop'], [$authCheck]);
        $this->router->post('/api/tables/truncate', [TableController::class, 'truncate'], [$authCheck]);
        $this->router->post('/api/tables/rename', [TableController::class, 'rename'], [$authCheck]);
        $this->router->get('/api/tables/rows', [TableController::class, 'getRows'], [$authCheck]);
        $this->router->post('/api/tables/rows', [TableController::class, 'insertRow'], [$authCheck]);
        $this->router->put('/api/tables/rows', [TableController::class, 'updateRow'], [$authCheck]);
        $this->router->delete('/api/tables/rows', [TableController::class, 'deleteRow'], [$authCheck]);
        $this->router->post('/api/tables/rows/bulk-delete', [TableController::class, 'bulkDeleteRows'], [$authCheck]);

        // Table Structure / Schema API
        $this->router->get('/api/structure/columns', [StructureController::class, 'getColumns'], [$authCheck]);
        $this->router->post('/api/structure/columns', [StructureController::class, 'addColumn'], [$authCheck]);
        $this->router->put('/api/structure/columns', [StructureController::class, 'modifyColumn'], [$authCheck]);
        $this->router->delete('/api/structure/columns', [StructureController::class, 'dropColumn'], [$authCheck]);
        $this->router->get('/api/structure/indexes', [StructureController::class, 'getIndexes'], [$authCheck]);
        $this->router->post('/api/structure/indexes', [StructureController::class, 'addIndex'], [$authCheck]);
        $this->router->delete('/api/structure/indexes', [StructureController::class, 'dropIndex'], [$authCheck]);
        $this->router->get('/api/structure/foreign-keys', [StructureController::class, 'getForeignKeys'], [$authCheck]);

        // Custom SQL Runner API
        $this->router->post('/api/query/execute', [QueryController::class, 'execute'], [$authCheck]);
        $this->router->post('/api/query/explain', [QueryController::class, 'explain'], [$authCheck]);
        $this->router->get('/api/query/history', [QueryController::class, 'history'], [$authCheck]);
        $this->router->post('/api/query/history/clear', [QueryController::class, 'clearHistory'], [$authCheck]);

        // Export & Import API
        $this->router->get('/api/export/dump', [ExportImportController::class, 'exportDump'], [$authCheck]);
        $this->router->get('/api/export/table', [ExportImportController::class, 'exportTableData'], [$authCheck]);
        $this->router->post('/api/import/sql', [ExportImportController::class, 'importSql'], [$authCheck]);

        // Server Monitor API
        $this->router->get('/api/server/status', [ServerController::class, 'status'], [$authCheck]);
        $this->router->get('/api/server/processes', [ServerController::class, 'processes'], [$authCheck]);
        $this->router->post('/api/server/kill-process', [ServerController::class, 'killProcess'], [$authCheck]);
        $this->router->get('/api/server/variables', [ServerController::class, 'variables'], [$authCheck]);
        $this->router->get('/api/server/engines', [ServerController::class, 'engines'], [$authCheck]);
    }

    public function requireAuthMiddleware(Request $request): void
    {
        $this->requireAuth();
    }

    public function run(): void
    {
        try {
            $this->router->dispatch($this->request);
        } catch (Throwable $e) {
            if ($this->request->isAjax() || str_starts_with($this->request->getUri(), '/api/')) {
                Response::error($e->getMessage(), $e->getCode() >= 400 && $e->getCode() < 600 ? (int)$e->getCode() : 500);
            } else {
                http_response_code(500);
                echo "<h1>Internal Application Error</h1><p>" . htmlspecialchars($e->getMessage()) . "</p>";
            }
        }
    }
}
