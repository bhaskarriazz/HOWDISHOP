#!/usr/bin/env bash
set -euo pipefail

TMUX=(tmux -f /exec-daemon/tmux.portal.conf)

sudo service postgresql start >/dev/null 2>&1 || sudo service postgresql start
until pg_isready -q; do sleep 1; done

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='howdi'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER howdi WITH PASSWORD 'howdi_dev' SUPERUSER CREATEDB;"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='howdi'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE howdi OWNER howdi;"

if [[ ! -f /workspace/backend/.env ]]; then
  cat > /workspace/backend/.env <<'EOF'
PORT=5000
DATABASE_URL=postgresql://howdi:howdi_dev@127.0.0.1:5432/howdi
NODE_ENV=development
HOWDI_PUBLIC_API_URL=http://localhost:5000
HOWDI_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
EOF
fi

if [[ ! -f /workspace/apps/customer/.env ]]; then
  echo 'VITE_API_BASE_URL=http://localhost:5000' > /workspace/apps/customer/.env
fi

start_tmux() {
  local name="$1"
  local dir="$2"
  local cmd="$3"
  if ! "${TMUX[@]}" has-session -t "=$name" 2>/dev/null; then
    "${TMUX[@]}" new-session -d -s "$name" -c "$dir" -- "${SHELL:-bash}" -l
  fi
  "${TMUX[@]}" send-keys -t "$name:0.0" "$cmd" C-m
}

for i in $(seq 1 60); do
  if curl -sf http://127.0.0.1:5000/api/health/live >/dev/null 2>&1; then
    if ! "${TMUX[@]}" has-session -t "=howdi-customer" 2>/dev/null; then
      start_tmux "howdi-customer" "/workspace/apps/customer" "npm run dev -- --host 0.0.0.0 --port 5173 2>&1 | tee -a /tmp/howdi-customer.log"
    fi
    for j in $(seq 1 30); do
      if curl -sf http://127.0.0.1:5173 >/dev/null 2>&1; then
        exit 0
      fi
      sleep 2
    done
    echo "Customer Vite dev server did not become ready; see /tmp/howdi-customer.log" >&2
    exit 1
  fi
  if ! pgrep -f "node server.js" >/dev/null 2>&1; then
    start_tmux "howdi-backend" "/workspace/backend" "node server.js 2>&1 | tee -a /tmp/howdi-backend.log"
  fi
  sleep 2
done

echo "HOWDI backend did not become ready within timeout; see /tmp/howdi-backend.log" >&2
exit 1
