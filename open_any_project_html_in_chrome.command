#!/bin/zsh
set -euo pipefail

ROOT="/Users/andriilitvinov/projects"
PORT="8877"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 /Users/andriilitvinov/projects/<path-to-file>.html"
  exit 1
fi

TARGET="$1"

case "$TARGET" in
  "$ROOT"/*) ;;
  *)
    echo "Target must be inside $ROOT"
    exit 1
    ;;
esac

RELATIVE_PATH="${TARGET#$ROOT/}"
URL_PATH="$(python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1]))' "$RELATIVE_PATH")"
URL="http://127.0.0.1:${PORT}/${URL_PATH}"

if ! launchctl print "gui/$(id -u)/com.andriilitvinov.codex-local-projects-http" >/dev/null 2>&1; then
  echo "Global projects HTTP service is not loaded."
  exit 1
fi

open -a "Google Chrome" "$URL"
echo "$URL"
