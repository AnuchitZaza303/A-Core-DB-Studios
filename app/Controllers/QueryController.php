<?php
namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Services\QueryService;
use Exception;

class QueryController
{
    private QueryService $queryService;

    public function __construct()
    {
        $this->queryService = new QueryService();
    }

    public function execute(Request $request): void
    {
        $sql = $request->post('sql', '');
        $database = $request->post('database', Session::getActiveDatabase());

        try {
            $result = $this->queryService->executeQuery($sql, $database);
            Response::success($result);
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function explain(Request $request): void
    {
        $sql = $request->post('sql', '');
        $database = $request->post('database', Session::getActiveDatabase());

        try {
            $result = $this->queryService->explainQuery($sql, $database);
            Response::success($result);
        } catch (Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function history(): void
    {
        $history = $this->queryService->getHistory();
        Response::success($history);
    }

    public function clearHistory(): void
    {
        $this->queryService->clearHistory();
        Response::success(null, 'ล้างประวัติคำสั่ง SQL เรียบร้อย');
    }
}
