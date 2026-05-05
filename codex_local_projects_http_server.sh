#!/bin/zsh
set -euo pipefail

ROOT="/Users/andriilitvinov/projects"
PORT="8877"
PYTHON="/opt/homebrew/bin/python3"

exec "$PYTHON" -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT"
