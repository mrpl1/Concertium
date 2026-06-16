#!/usr/bin/env bash
#
# Manual deploy of the latest `main` on the Hostinger server.
# Run from anywhere inside the project, over SSH:
#
#   bash scripts/deploy.sh
#
# Requires Node/npm on PATH (on Hostinger you may need to activate the app's
# Node first, e.g. `source ~/nodevenv/domains/DOMAIN/nodejs/<ver>/bin/activate`),
# and DATABASE_URL + AUTH_SECRET present in the environment / .env.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "→ Pulling latest main"
git fetch origin main
git reset --hard origin/main

echo "→ Installing dependencies"
npm install --no-audit --no-fund

echo "→ Syncing database schema"
npx prisma generate
npx prisma db push --skip-generate

echo "→ Building"
npm run build

echo "→ Restarting app"
mkdir -p tmp && touch tmp/restart.txt

echo "✓ Deploy complete"
