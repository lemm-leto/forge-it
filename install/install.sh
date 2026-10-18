#!/usr/bin/env sh
set -eu

target=""
if [ "${1:-}" = "--target" ]; then
  target="${2:-}"
fi

if [ -z "$target" ]; then
  if [ ! -r /dev/tty ]; then
    echo '{"error":{"code":"TARGET_REQUIRED","message":"Pass --target opencode or --target claude-code when no interactive terminal is available"}}' >&2
    exit 1
  fi
  printf '\nWhich platform should Forge It be installed for?\n\n1. OpenCode\n2. Claude Code\n\nEnter a number: ' > /dev/tty
  IFS= read -r choice < /dev/tty
  case "$choice" in
    1) target="opencode" ;;
    2) target="claude-code" ;;
    *) echo '{"error":{"code":"TARGET_INVALID","message":"Enter 1 for OpenCode or 2 for Claude Code"}}' >&2; exit 1 ;;
  esac
fi

case "$target" in
  opencode|claude-code) ;;
  *) echo '{"error":{"code":"TARGET_INVALID","message":"Use opencode or claude-code"}}' >&2; exit 1 ;;
esac

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo '{"error":{"code":"NODE_REQUIRED","message":"Node.js 22+ and npm are required"}}' >&2
  exit 1
fi

npm install --global "${FORGE_IT_PACKAGE:-@forge-it/installer}"
forge-it install --target "$target"
