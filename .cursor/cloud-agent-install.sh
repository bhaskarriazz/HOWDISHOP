#!/usr/bin/env bash
set -euo pipefail

cd /workspace

if ! command -v psql >/dev/null 2>&1; then
  sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-contrib
fi

npm install --no-audit --no-fund
npm install --prefix backend --no-audit --no-fund
npm install --prefix apps/customer --no-audit --no-fund

node --check backend/server.js
npm run build --prefix apps/customer
