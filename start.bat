@echo off
title A-Core DB Studio
echo ========================================================
echo   Starting A-Core DB Studio...
echo   URL: http://127.0.0.1:8000
echo   Press Ctrl+C to stop the server
echo ========================================================

start "" http://127.0.0.1:8000
php -S 127.0.0.1:8000 -t public
pause
