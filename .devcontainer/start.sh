#!/usr/bin/env bash
# Starts Recruit24 in production mode and prints the link. Safe to run more than once.
set -uo pipefail
cd "$(dirname "$0")/.."
PORT=3000

if [ -n "${CODESPACE_NAME:-}" ]; then
  URL="https://${CODESPACE_NAME}-${PORT}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
else
  URL="http://localhost:${PORT}"
fi
# Links in e-mails and the candidate portal use APP_URL.
sed -i "s#^APP_URL=.*#APP_URL=\"${URL}\"#" .env

banner() {
  echo
  echo "  ================================================================"
  echo "   Recruit24 laeuft:  ${URL}/login"
  echo "   Login: demo@recruit24.ch  /  Recruit24-Demo-2026"
  echo "   Frische Demo-Daten: in einem neuen Terminal  npm run db:seed"
  echo "  ================================================================"
  echo
}

if curl -s -o /dev/null "http://localhost:${PORT}/login"; then banner; exit 0; fi

# Rebuild only when the code changed since the last build (e.g. after git pull).
if [ ! -f .next/BUILD_ID ] || [ -n "$(find src prisma public next.config.ts package.json -newer .next/BUILD_ID -print -quit 2>/dev/null)" ]; then
  echo "Recruit24 wird gebaut ..."
  npm run build || exit 1
fi

(
  for i in $(seq 1 90); do curl -s -o /dev/null "http://localhost:${PORT}/login" && break; sleep 2; done
  # Public port: the applicant window (private browser window) works without a GitHub login.
  [ -n "${CODESPACE_NAME:-}" ] && gh codespace ports visibility "${PORT}:public" -c "${CODESPACE_NAME}" >/dev/null 2>&1
  banner
) &

exec npm start
