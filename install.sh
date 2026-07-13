#!/usr/bin/env bash
set -euo pipefail

# Kiyota Keystone — one-command installer
# Installs dependencies, required tools, and starts PostgreSQL + Redis.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> Installing Keystone backend dependencies..."
npm install

echo "==> Installing Keystone setup frontend dependencies..."
cd frontend
npm install

echo "==> Installing Playwright Chromium for E2E tests..."
npx playwright install --with-deps chromium

cd "$SCRIPT_DIR"

echo ""
echo "==> Starting PostgreSQL and Redis (via Docker if available)..."
./scripts/start-services.sh || true

echo ""
echo "==> Installation complete."
echo ""
echo "Next steps:"
echo "  1. Start everything: ./start.sh"
echo "     (If no .env exists, Keystone will launch the browser setup wizard.)"
echo "  2. Open http://localhost:5173 and follow the wizard."
echo "  3. Copy the setup token from the server logs when prompted."
echo ""
