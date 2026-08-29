<!DOCTYPE html>
<html lang="th" class="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>A-Core DB Studio - Modern Database Manager</title>
    
    <!-- Google Fonts: Sarabun & JetBrains Mono -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
    
    <!-- Font Awesome 6 Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==" crossorigin="anonymous" referrerpolicy="no-referrer" />
    
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Sarabun', 'sans-serif'],
                        mono: ['"JetBrains Mono"', 'monospace'],
                    },
                    colors: {
                        brand: {
                            50: '#eef2ff',
                            100: '#e0e7ff',
                            200: '#c7d2fe',
                            300: '#a5b4fc',
                            400: '#818cf8',
                            500: '#6366f1',
                            600: '#4f46e5',
                            700: '#4338ca',
                            800: '#3730a3',
                            900: '#312e81',
                            950: '#1e1b4b',
                        },
                        dark: {
                            bg: '#0f172a',
                            card: '#1e293b',
                            sidebar: '#0b1120',
                            border: '#334155',
                            hover: '#273549',
                            input: '#0f172a',
                        }
                    }
                }
            }
        }
    </script>
    
    <!-- Instant Theme & Zoom Initializer -->
    <script>
        (function() {
            const savedTheme = localStorage.getItem('acore_theme') || 'light';
            document.documentElement.className = savedTheme;
            const savedZoom = localStorage.getItem('acore_zoom') || '100%';
            document.documentElement.style.zoom = savedZoom;
        })();
    </script>
    
    <?php
        // Resolve assets base path relative to current URL (Windows Server & Linux safe)
        $scriptName = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');
        $baseUri = str_replace('\\', '/', rtrim(dirname($scriptName), '/\\'));
        if ($baseUri === '.' || $baseUri === '/' || $baseUri === '\\') {
            $baseUri = '';
        }
        $assetPrefix = (str_ends_with($baseUri, 'public') || str_ends_with($baseUri, 'public/')) ? $baseUri : $baseUri . '/public';
        $assetPrefix = rtrim($assetPrefix, '/');
        
        $apiPrefix = rtrim($baseUri, '/');
        if (str_ends_with($apiPrefix, '/public')) {
            $apiPrefix = substr($apiPrefix, 0, -7);
        }
        $apiPrefix = ($apiPrefix === '' ? '' : $apiPrefix) . '/api';
        $assetVer = '1.1.1_' . time();
    ?>
    <link rel="stylesheet" href="<?= $assetPrefix ?>/assets/css/app.css?v=<?= $assetVer ?>">
</head>
<body class="bg-slate-900 text-slate-100 font-sans antialiased min-h-screen overflow-hidden">

    <!-- Loading Bar Indicator -->
    <div id="global-loading-bar" class="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 z-50 transform -translate-y-full transition-transform duration-300"></div>

    <!-- Application Wrapper -->
    <div id="app-container" class="flex flex-col h-screen overflow-hidden">
        
        <!-- Header Component -->
        <header id="app-header" class="h-14 bg-slate-900/90 backdrop-blur border-b border-slate-800 flex items-center justify-between px-4 z-20 flex-shrink-0">
            <!-- Header will be rendered dynamically by Header.js -->
        </header>

        <!-- Main Body (Sidebar + Content Workspace) -->
        <div class="flex flex-1 overflow-hidden min-h-0">
            
            <!-- Left Navigation Sidebar -->
            <aside id="app-sidebar" class="w-72 bg-slate-950/70 backdrop-blur border-r border-slate-800/80 flex flex-col flex-shrink-0 transition-all duration-300 min-h-0">
                <!-- Sidebar will be rendered dynamically by Sidebar.js -->
            </aside>

            <!-- Main Content Area -->
            <main id="app-main" class="flex-1 flex flex-col bg-slate-900/50 overflow-hidden relative min-w-0 min-h-0">
                <!-- Nav Tabs for Active Table/View -->
                <div id="view-tabs-container" class="h-10 bg-slate-900 border-b border-slate-800 flex items-center px-4 space-x-1 flex-shrink-0">
                    <!-- Tabs rendered dynamically -->
                </div>

                <!-- Tab Panels Area -->
                <div id="tab-content-area" class="flex-1 overflow-y-auto overflow-x-hidden p-4 relative min-h-0 flex flex-col">
                    <!-- Dynamic views: DataGrid, SchemaViewer, SqlEditor, ExportImport, ServerMonitor -->
                </div>
            </main>
        </div>

        <!-- Footer / Status Bar -->
        <footer id="app-footer" class="h-7 bg-slate-950 border-t border-slate-800/80 px-4 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
            <div class="flex items-center space-x-4">
                <span id="footer-db-status" class="flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Ready</span>
                </span>
                <span id="footer-active-info" class="text-slate-400">No database selected</span>
            </div>
            <div class="flex items-center space-x-3 text-slate-400">
                <span id="footer-exec-time"></span>
                <span>A-Core DB Studio v1.0.0</span>
            </div>
        </footer>
    </div>

    <!-- Connection Portal Modal (Shown when disconnected) -->
    <div id="connection-modal" class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 hidden transition-opacity duration-300">
        <!-- Rendered by AuthController / Modal -->
    </div>

    <!-- Universal Dynamic Modal Dialog -->
    <div id="dynamic-modal" class="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-40 hidden transition-opacity duration-200">
        <div id="dynamic-modal-box" class="bg-slate-800 border border-slate-700 text-slate-100 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform scale-95 transition-transform duration-200">
            <!-- Modal Header, Body, Footer -->
        </div>
    </div>

    <!-- Toast Notifications Container -->
    <div id="toast-container" class="fixed bottom-10 right-6 flex flex-col space-y-2 z-50 pointer-events-none"></div>

    <!-- Application Javascript Modules -->
    <script>
        window.APP_CONFIG = {
            baseUri: "<?= $assetPrefix ?>",
            apiPrefix: "<?= $apiPrefix ?>"
        };
    </script>
    <script type="module" src="<?= $assetPrefix ?>/assets/js/app.js?v=<?= $assetVer ?>"></script>
</body>
</html>
