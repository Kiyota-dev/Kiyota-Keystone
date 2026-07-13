#!/usr/bin/env bash
set -euo pipefail

# Kiyota Keystone — one-command installer
# Installs dependencies, required tools, Docker (if needed), and starts PostgreSQL + Redis.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    echo "✅ Docker is already installed."
    return 0
  fi

  echo ""
  echo "==> Docker not found. Installing Docker..."
  echo "    This uses the official Docker convenience script (https://get.docker.com)."

  if command -v curl >/dev/null 2>&1; then
    curl -fsSL https://get.docker.com | sh
  elif command -v wget >/dev/null 2>&1; then
    wget -qO- https://get.docker.com | sh
  else
    echo "❌ curl or wget is required to install Docker. Please install Docker manually."
    exit 1
  fi

  # Try to start Docker service.
  if command -v systemctl >/dev/null 2>&1; then
    sudo systemctl start docker || true
    sudo systemctl enable docker || true
  elif command -v service >/dev/null 2>&1; then
    sudo service docker start || true
  fi

  # Add current user to docker group so sudo is not required.
  if command -v usermod >/dev/null 2>&1; then
    sudo usermod -aG docker "${USER}" || true
    echo ""
    echo "⚠️  You have been added to the docker group."
    echo "   Log out and back in (or run 'newgrp docker') for this to take effect."
    echo "   Until then, Docker commands may require sudo."
  fi

  echo "✅ Docker installation complete."
}

echo "==> Installing Keystone backend dependencies..."
npm install

echo "==> Installing Keystone setup frontend dependencies..."
cd frontend
npm install

echo "==> Installing Playwright Chromium for E2E tests..."
npx playwright install --with-deps chromium

cd "$SCRIPT_DIR"

install_docker

echo ""
echo "==> Starting PostgreSQL and Redis (via Docker)..."
./scripts/start-services.sh || true

echo ""
echo "==> Installation complete."
echo ""
echo "Next steps:"
echo "  1. If Docker was just installed, log out and back in (or run 'newgrp docker')."
echo "  2. Start everything: ./start.sh"
echo "     (If no .env exists, Keystone will launch the browser setup wizard.)"
echo "  3. Open http://localhost:5173 and follow the wizard."
echo "  4. Copy the setup token from the server logs when prompted."
echo ""
