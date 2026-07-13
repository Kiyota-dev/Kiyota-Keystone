#!/usr/bin/env bash
set -euo pipefail

# Kiyota Keystone — one-command installer
# Installs backend dependencies, frontend dependencies, and required tools.

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
echo "==> Installation complete."
echo ""
echo "Next steps:"
echo "  1. Copy .env.example to .env and configure DATABASE_URL, REDIS_URL, etc."
echo "  2. Start Postgres and Redis (e.g. docker compose up -d)"
echo "  3. Run migrations: npm run db:migrate"
echo "  4. Start everything: ./start.sh"
echo ""
