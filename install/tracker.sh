#!/usr/bin/env sh
set -eu

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo '{"error":{"code":"NODE_REQUIRED","message":"Node.js 22+ and npm are required to install forge-tracker"}}' >&2
  exit 1
fi

npm install --global @forge-it/tracker
echo '{"data":{"installed":"forge-tracker"},"meta":{"next":"Set VIKUNJA_URL, VIKUNJA_TOKEN and VIKUNJA_DEFAULT_PROJECT_ID"}}'
