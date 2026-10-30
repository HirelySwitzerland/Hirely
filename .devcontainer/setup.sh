#!/usr/bin/env bash
# Runs once when the codespace is created: install, database, demo data, production build.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== Recruit24 wird eingerichtet (dauert beim ersten Mal ein paar Minuten) =="
npm ci --no-audit --no-fund

[ -f .env ] || node scripts/setup.mjs
sed -i 's#^DATABASE_URL=.*#DATABASE_URL="postgresql://hirely:hirely@localhost:5432/hirely"#' .env

npx prisma generate
for i in $(seq 1 30); do
  npx prisma db push --skip-generate && break
  echo "Warte auf die Datenbank ..."; sleep 2
done
npm run db:seed
npm run build
echo "== Einrichtung fertig =="
