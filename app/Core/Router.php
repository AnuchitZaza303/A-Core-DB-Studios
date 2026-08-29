<?php
namespace App\Core;

use Exception;

class Router
{
    private array $routes = [];
    private array $middlewares = [];
    private string $basePath = '';

    public function __construct(string $basePath = '')
    {
        $this->basePath = rtrim($basePath, '/');
    }

    public function addRoute(string $method, string $path, array|callable $handler, array $middlewares = []): self
    {
        $this->routes[] = [
            'method' => strtoupper($method),
            'path' => $this->basePath . '/' . ltrim($path, '/'),
            'handler' => $handler,
            'middlewares' => $middlewares,
        ];
        return $this;
    }

    public function get(string $path, array|callable $handler, array $middlewares = []): self
    {
        return $this->addRoute('GET', $path, $handler, $middlewares);
    }

    public function post(string $path, array|callable $handler, array $middlewares = []): self
    {
        return $this->addRoute('POST', $path, $handler, $middlewares);
    }

    public function put(string $path, array|callable $handler, array $middlewares = []): self
    {
        return $this->addRoute('PUT', $path, $handler, $middlewares);
    }

    public function delete(string $path, array|callable $handler, array $middlewares = []): self
    {
        return $this->addRoute('DELETE', $path, $handler, $middlewares);
    }

    public function dispatch(Request $request): void
    {
        $requestMethod = $request->getMethod();
        $requestUri = $request->getUri();

        // Handle CORS Preflight if any
        if ($requestMethod === 'OPTIONS') {
            header('Access-Control-Allow-Origin: *');
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
            exit;
        }

        // Normalize API endpoints: Any request targeting /api/... cleanly maps to /api/...
        if (preg_match('#(/api(?:/.*)?)$#', $requestUri, $apiMatch)) {
            $requestUri = $apiMatch[1];
        } else {
            $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
            $scriptDir = dirname($scriptName);
            if ($scriptDir !== '/' && $scriptDir !== '\\' && str_starts_with($requestUri, $scriptDir)) {
                $requestUri = substr($requestUri, strlen($scriptDir));
            }
            $requestUri = preg_replace('#^/(A-Core|a-core)(/public)?#i', '', $requestUri);
            $requestUri = '/' . ltrim($requestUri, '/');
            if ($requestUri === '') {
                $requestUri = '/';
            }
        }

        foreach ($this->routes as $route) {
            if ($route['method'] !== $requestMethod) {
                continue;
            }

            $pattern = $this->convertPathToRegex($route['path']);
            if (preg_match($pattern, $requestUri, $matches)) {
                // Remove numeric keys from regex matches
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);

                // Run Middlewares
                foreach ($route['middlewares'] as $middleware) {
                    if (is_callable($middleware)) {
                        $middleware($request);
                    }
                }

                // Execute Handler
                $handler = $route['handler'];
                if (is_callable($handler)) {
                    call_user_func_array($handler, [$request, $params]);
                    return;
                }

                if (is_array($handler) && count($handler) === 2) {
                    [$controllerClass, $method] = $handler;
                    if (class_exists($controllerClass)) {
                        $controllerInstance = new $controllerClass();
                        if (method_exists($controllerInstance, $method)) {
                            call_user_func_array([$controllerInstance, $method], [$request, $params]);
                            return;
                        }
                    }
                }

                throw new Exception("Handler for route {$route['path']} not found or invalid.", 500);
            }
        }

        // Fallback for API 404
        if (str_starts_with($requestUri, '/api/')) {
            Response::error("Endpoint not found: {$requestMethod} {$requestUri}", 404);
            return;
        }

        // Fallback for non-API: Serve the main view
        require_once __DIR__ . '/../../views/app.php';
    }

    private function convertPathToRegex(string $path): string
    {
        $pattern = preg_replace('#\{([a-zA-Z0-9_]+)\}#', '(?P<$1>[^/]+)', $path);
        return '#^' . $pattern . '$#';
    }
}
