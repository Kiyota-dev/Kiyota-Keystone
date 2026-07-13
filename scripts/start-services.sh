#!/usr/bin/env bash
set -euo pipefail

# Start Keystone dependencies (PostgreSQL + Redis) via Docker if available.
# Falls back to printing instructions when Docker is not installed.

POSTGRES_CONTAINER="keystone-postgres"
REDIS_CONTAINER="keystone-redis"

if ! command -v docker >/dev/null 2>&1; then
  echo ""
  echo "⚠️  Docker is not installed. Keystone needs PostgreSQL and Redis to run."
  echo "   Install Docker and run:"
  echo "     docker compose up -d"
  echo "   Or install PostgreSQL and Redis manually."
  echo ""
  exit 1
fi

# Determine whether we can use docker directly or need sudo.
DOCKER_CMD="docker"
if ! docker ps >/dev/null 2>&1; then
  if sudo docker ps >/dev/null 2>&1; then
    DOCKER_CMD="sudo docker"
  else
    echo ""
    echo "⚠️  Docker is installed but not accessible."
    echo "   Either:"
    echo "     - Run 'newgrp docker' and try again, or"
    echo "     - Log out and back in to apply the docker group, or"
    echo "     - Run this script with sudo."
    echo ""
    exit 1
  fi
fi

start_postgres() {
  if ${DOCKER_CMD} ps --format '{{.Names}}' | grep -qx "${POSTGRES_CONTAINER}"; then
    echo "✅ PostgreSQL container is already running."
    return
  fi

  if ${DOCKER_CMD} ps -a --format '{{.Names}}' | grep -qx "${POSTGRES_CONTAINER}"; then
    echo "==> Starting existing PostgreSQL container..."
    ${DOCKER_CMD} start "${POSTGRES_CONTAINER}"
  else
    echo "==> Creating PostgreSQL container..."
    ${DOCKER_CMD} run -d \
      --name "${POSTGRES_CONTAINER}" \
      -e POSTGRES_USER=kiyota \
      -e POSTGRES_PASSWORD=kiyota \
      -e POSTGRES_DB=kiyota \
      -p 5432:5432 \
      --health-cmd pg_isready \
      --health-interval 10s \
      --health-timeout 5s \
      --health-retries 5 \
      postgres:16
  fi
}

start_redis() {
  if ${DOCKER_CMD} ps --format '{{.Names}}' | grep -qx "${REDIS_CONTAINER}"; then
    echo "✅ Redis container is already running."
    return
  fi

  if ${DOCKER_CMD} ps -a --format '{{.Names}}' | grep -qx "${REDIS_CONTAINER}"; then
    echo "==> Starting existing Redis container..."
    ${DOCKER_CMD} start "${REDIS_CONTAINER}"
  else
    echo "==> Creating Redis container..."
    ${DOCKER_CMD} run -d \
      --name "${REDIS_CONTAINER}" \
      -p 6379:6379 \
      --health-cmd "redis-cli ping" \
      --health-interval 10s \
      --health-timeout 5s \
      --health-retries 5 \
      redis:7
  fi
}

start_postgres
start_redis

echo ""
echo "==> Waiting for services to be healthy..."
for i in {1..30}; do
  pg_status=$(${DOCKER_CMD} inspect --format='{{.State.Health.Status}}' "${POSTGRES_CONTAINER}" 2>/dev/null || echo "unhealthy")
  redis_status=$(${DOCKER_CMD} inspect --format='{{.State.Health.Status}}' "${REDIS_CONTAINER}" 2>/dev/null || echo "unhealthy")
  if [ "${pg_status}" = "healthy" ] && [ "${redis_status}" = "healthy" ]; then
    echo "✅ PostgreSQL and Redis are ready."
    echo ""
    exit 0
  fi
  sleep 1
done

echo "⚠️  Services did not become healthy within 30 seconds."
echo "   Check with: ${DOCKER_CMD} logs ${POSTGRES_CONTAINER} / ${REDIS_CONTAINER}"
echo ""
exit 1
