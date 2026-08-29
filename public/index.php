<?php
/**
 * A-Core Database Studio - Public Entry Point
 */

declare(strict_types=1);

require_once __DIR__ . '/../app/Core/Application.php';

\App\Core\Application::autoload();

$app = new \App\Core\Application();
$app->run();
