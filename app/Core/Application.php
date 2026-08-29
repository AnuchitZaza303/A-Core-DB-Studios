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

    private function requireAppAuth(): void
    {
        $config = require __DIR__ . '/../../config/app.php';
        if (!empty($config['auth_required'])) {
            if (Session::get('app_authenticated') !== true) {
                Response::error('กรุณาเข้าสู่ระบบ A-Core DB Studio ก่อน', 401);
            }
        }
    }

    private function requireAuth(): void
    {
        $this->requireAppAuth();
        if (!Database::isConnected()) {
            Response::error('ยังไม่ได้เชื่อมต่อฐานข้อมูล กรุณาเข้าสู่ระบบก่อน', 401);
        }
    }

    private function registerRoutes(): void
    {
        $appAuthCheck = [$this, 'requireAppAuthMiddleware'];
        $dbAuthCheck = [$this, 'requireAuthMiddleware'];

        // Web UI
        $this->router->get('/', function () {
            require_once __DIR__ . '/../../views/app.php';
        });

        // App Master Gate API
        $this->router->get('/api/auth/app-status', [AuthController::class, 'appStatus']);
        $this->router->post('/api/auth/app-login', [AuthController::class, 'appLogin']);
        $this->router->post('/api/auth/app-logout', [AuthController::class, 'appLogout']);

        // Database Connection API
        $this->router->post('/api/auth/connect', [AuthController::class, 'connect'], [$appAuthCheck]);
        $this->router->get('/api/auth/status', [AuthController::class, 'status']);
        $this->router->post('/api/auth/disconnect', [AuthController::class, 'disconnect']);
        $this->router->get('/api/auth/profiles', [AuthController::class, 'getProfiles'], [$appAuthCheck]);
        $this->router->post('/api/auth/profiles', [AuthController::class, 'saveProfile'], [$appAuthCheck]);
        $this->router->delete('/api/auth/profiles', [AuthController::class, 'deleteProfile'], [$appAuthCheck]);

        // Database API
        $this->router->get('/api/databases', [DatabaseController::class, 'index'], [$dbAuthCheck]);
        $this->router->post('/api/databases', [DatabaseController::class, 'create'], [$dbAuthCheck]);
        $this->router->delete('/api/databases', [DatabaseController::class, 'drop'], [$dbAuthCheck]);
        $this->router->post('/api/databases/select', [DatabaseController::class, 'select'], [$dbAuthCheck]);
        $this->router->get('/api/databases/collations', [DatabaseController::class, 'collations'], [$dbAuthCheck]);

        // Table & Data API
        $this->router->get('/api/tables', [TableController::class, 'index'], [$dbAuthCheck]);
        $this->router->post('/api/tables', [TableController::class, 'create'], [$dbAuthCheck]);
        $this->router->delete('/api/tables', [TableController::class, 'drop'], [$dbAuthCheck]);
        $this->router->post('/api/tables/truncate', [TableController::class, 'truncate'], [$dbAuthCheck]);
        $this->router->post('/api/tables/rename', [TableController::class, 'rename'], [$dbAuthCheck]);
        $this->router->get('/api/tables/rows', [TableController::class, 'getRows'], [$dbAuthCheck]);
        $this->router->post('/api/tables/rows', [TableController::class, 'insertRow'], [$dbAuthCheck]);
        $this->router->put('/api/tables/rows', [TableController::class, 'updateRow'], [$dbAuthCheck]);
        $this->router->delete('/api/tables/rows', [TableController::class, 'deleteRow'], [$dbAuthCheck]);
        $this->router->post('/api/tables/rows/bulk-delete', [TableController::class, 'bulkDeleteRows'], [$dbAuthCheck]);

        // Table Structure / Schema API
        $this->router->get('/api/structure/columns', [StructureController::class, 'getColumns'], [$dbAuthCheck]);
        $this->router->post('/api/structure/columns', [StructureController::class, 'addColumn'], [$dbAuthCheck]);
        $this->router->put('/api/structure/columns', [StructureController::class, 'modifyColumn'], [$dbAuthCheck]);
        $this->router->delete('/api/structure/columns', [StructureController::class, 'dropColumn'], [$dbAuthCheck]);
        $this->router->get('/api/structure/indexes', [StructureController::class, 'getIndexes'], [$dbAuthCheck]);
        $this->router->post('/api/structure/indexes', [StructureController::class, 'addIndex'], [$dbAuthCheck]);
        $this->router->delete('/api/structure/indexes', [StructureController::class, 'dropIndex'], [$dbAuthCheck]);
        $this->router->get('/api/structure/foreign-keys', [StructureController::class, 'getForeignKeys'], [$dbAuthCheck]);

        // Custom SQL Runner API
        $this->router->post('/api/query/execute', [QueryController::class, 'execute'], [$dbAuthCheck]);
        $this->router->post('/api/query/explain', [QueryController::class, 'explain'], [$dbAuthCheck]);
        $this->router->get('/api/query/history', [QueryController::class, 'history'], [$dbAuthCheck]);
        $this->router->post('/api/query/history/clear', [QueryController::class, 'clearHistory'], [$dbAuthCheck]);

        // Export & Import API
        $this->router->get('/api/export/dump', [ExportImportController::class, 'exportDump'], [$dbAuthCheck]);
        $this->router->get('/api/export/table', [ExportImportController::class, 'exportTableData'], [$dbAuthCheck]);
        $this->router->post('/api/import/sql', [ExportImportController::class, 'importSql'], [$dbAuthCheck]);

        // Server Monitor API
        $this->router->get('/api/server/status', [ServerController::class, 'status'], [$dbAuthCheck]);
        $this->router->get('/api/server/processes', [ServerController::class, 'processes'], [$dbAuthCheck]);
        $this->router->post('/api/server/kill-process', [ServerController::class, 'killProcess'], [$dbAuthCheck]);
        $this->router->get('/api/server/variables', [ServerController::class, 'variables'], [$dbAuthCheck]);
        $this->router->get('/api/server/engines', [ServerController::class, 'engines'], [$dbAuthCheck]);
    }

    public function requireAppAuthMiddleware(Request $request): void
    {
        $this->requireAppAuth();
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
