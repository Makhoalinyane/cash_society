#!/usr/bin/env bash
# Run this on AlwaysData SSH after every code change:
#   bash scripts/host-update.sh
# Then: AlwaysData admin → Web → Sites → Restart your site

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Cash Society host update"
echo "    folder: $ROOT"

if ! command -v git >/dev/null 2>&1; then
  echo "ERROR: git not found"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm not found"
  exit 1
fi

echo "==> Fetch latest from GitHub (main)"
git fetch origin main
# Drop local edits that block pull (e.g. accidental file changes on host)
git reset --hard origin/main
git clean -fd -e backend/node_modules -e frontend/node_modules

COMMIT="$(git rev-parse --short HEAD)"
echo "==> Code is at $COMMIT"

echo "==> Install backend packages only (no Vite build — frontend is prebuilt in backend/public)"
npm install --prefix backend --omit=dev

if [ ! -f backend/public/index.html ]; then
  echo "ERROR: backend/public/index.html missing after pull."
  echo "       Prebuilt UI must be on GitHub. On your PC run: npm run build && git add -f backend/public && git push"
  exit 1
fi

echo "$COMMIT $(date -u +%Y-%m-%dT%H:%M:%SZ)" > backend/public/deploy-version.txt
echo "$COMMIT" > backend/.deploy-version

echo ""
echo "==> Update finished: $COMMIT"
echo ""
echo "IMPORTANT — AlwaysData does not auto-restart after git pull."
echo "Do this now in the admin panel:"
echo "  1. Web → Sites"
echo "  2. Open your Cash Society site"
echo "  3. Click Restart (or Save)"
echo ""
echo "Then open:"
echo "  https://YOURNAME.alwaysdata.net/api/version"
echo "  → commit should show: $COMMIT"
echo "  https://YOURNAME.alwaysdata.net/api/health"
echo "  → database: connected"
echo ""
echo "Hard-refresh the browser (Ctrl+F5) so the old page cache is dropped."
