#!/bin/zsh
cd /Users/andriilitvinov/projects || exit 1
if ! lsof -iTCP:8891 -sTCP:LISTEN >/dev/null 2>&1; then
  nohup python3 -m http.server 8891 >/tmp/books_unified_library_8891.log 2>&1 &
  sleep 1
fi
open -a "Google Chrome" "http://127.0.0.1:8891/books/final/unified-library.html"
