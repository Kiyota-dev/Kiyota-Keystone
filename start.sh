#!/usr/bin/env bash
set -euo pipefail

# Kiyota Keystone — unified development starter
# Starts the backend API (or setup server) and the setup frontend from the project root.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load environment variables if .env exists
if [ -f .env ]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi

# Default ports
export PORT="${PORT:-4001}"
export KEYSTONE_API_URL="${KEYSTONE_API_URL:-http://localhost:${PORT}}"

# Detect whether we are in first-run setup mode (no DATABASE_URL configured)
if [ -z "${DATABASE_URL:-}" ]; then
  export KEYSTONE_SETUP_MODE="true"
  BACKEND_COMMAND="npx tsx watch src/setup-server.ts"
  BACKEND_LABEL="setup server"
else
  BACKEND_COMMAND="npx tsx watch src/index.ts"
  BACKEND_LABEL="backend API"
fi

cleanup() {
  echo ""
  echo "==> Shutting down Keystone services..."
  if [ -n "${BACKEND_PID:-}" ]; then kill "$BACKEND_PID" 2>/dev/null || true; fi
  if [ -n "${FRONTEND_PID:-}" ]; then kill "$FRONTEND_PID" 2>/dev/null || true; fi
  wait 2>/dev/null || true
  echo "==> Done."
}
trap cleanup INT TERM EXIT

echo "==> Starting Keystone ${BACKEND_LABEL} on port ${PORT}..."
${BACKEND_COMMAND} &
BACKEND_PID=$!

echo "==> Starting Keystone setup frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!

cd "$SCRIPT_DIR"

echo ""
echo "==> Keystone is starting up:"
echo "    API:      http://localhost:${PORT}"
echo "    Setup UI: http://localhost:5173"
echo ""
if [ -n "${KEYSTONE_SETUP_MODE:-}" ]; then
  echo "    Setup mode active. Copy the setup token from the server logs"
  echo "    and paste it into the wizard to continue."
  echo ""
fi
echo "    Press Ctrl+C to stop both services."
echo ""

wait
