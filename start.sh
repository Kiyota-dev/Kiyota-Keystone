: "${BOLD:=\033[1m}"
: "${RESET:=\033[0m}"
: "${GREEN:=\033[32m}"
: "${YELLOW:=\033[33m}"
: "${RED:=\033[31m}"
: "${BLUE:=\033[34m}"
: "${CYAN:=\033[36m}"
: "${GRAY:=\033[90m}"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# shellcheck source=scripts/ui.sh
source "${SCRIPT_DIR}/scripts/ui.sh"

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

ui_header "Kiyota Keystone Launcher" "Starting the identity platform"

# Service status checks
ui_step "Checking dependencies..."
if command -v docker >/dev/null 2>&1; then
  if docker ps --format '{{.Names}}' | grep -qx "keystone-postgres" && docker ps --format '{{.Names}}' | grep -qx "keystone-redis"; then
    ui_success "PostgreSQL and Redis containers are running."
  else
    ui_warning "PostgreSQL and/or Redis containers are not running."
    if ui_confirm "Start PostgreSQL and Redis now?"; then
      ./scripts/start-services.sh
    else
      ui_info "Continuing without starting services. You can enter external URLs in the wizard."
    fi
  fi
else
  ui_warning "Docker is not installed. PostgreSQL and Redis must be running manually."
fi

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
  ui_step "Shutting down Keystone services..."
  if [ -n "${BACKEND_PID:-}" ]; then kill "$BACKEND_PID" 2>/dev/null || true; fi
  if [ -n "${FRONTEND_PID:-}" ]; then kill "$FRONTEND_PID" 2>/dev/null || true; fi
  wait 2>/dev/null || true
  ui_success "Done."
}
trap cleanup INT TERM EXIT

echo ""
ui_step "Starting Keystone ${BACKEND_LABEL} on port ${PORT}..."
${BACKEND_COMMAND} &
BACKEND_PID=$!

ui_info "Waiting for backend health check..."
if ui_wait_for_url "http://localhost:${PORT}/health" 60; then
  ui_success "Keystone backend is ready."
else
  ui_warning "Backend health check timed out. The frontend may show temporary errors."
fi

echo ""
ui_step "Starting Keystone setup frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!

cd "$SCRIPT_DIR"

ui_divider
echo ""
ui_success "Keystone is starting up:"
echo ""
echo -e "  ${BOLD}API:${RESET}      http://localhost:${PORT}"
echo -e "  ${BOLD}Setup UI:${RESET} http://localhost:5173"
echo ""
if [ -n "${KEYSTONE_SETUP_MODE:-}" ]; then
  ui_warning "Setup mode active."
  ui_info "Copy the setup token from the server logs and paste it into the wizard."
  echo ""
fi
echo -e "  ${GRAY}Press Ctrl+C to stop both services.${RESET}"
echo ""

wait
