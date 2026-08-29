#!/usr/bin/env bash
# ==============================================================================
# A-Core DB Studio - Standalone Quick Start Script
# ==============================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PORT=8000
HOST="127.0.0.1"

echo "========================================================"
echo "  🚀 Starting A-Core DB Studio..."
echo "  🌐 URL: http://${HOST}:${PORT}"
echo "  📂 Location: ${DIR}"
echo "  🛑 Press Ctrl+C to stop the server"
echo "========================================================"

# Auto open default browser
if which open > /dev/null; then
    (sleep 1 && open "http://${HOST}:${PORT}") &
elif which xdg-open > /dev/null; then
    (sleep 1 && xdg-open "http://${HOST}:${PORT}") &
fi

# Run PHP Built-in Web Server
cd "${DIR}"
php -S "${HOST}:${PORT}" -t public
