#!/bin/zsh
# Safe Andrey Voice preflight and optional free MLX installation.
# Does not read client reports, use a paid API or enable the website worker.
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This installer is only for macOS."; exit 2
fi

printf 'macOS: %s\nCPU: %s\n' "$(sw_vers -productVersion)" "$(uname -m)"
sysctl -n hw.memsize | awk '{printf "Memory: %.1f GiB\n", $1/1073741824}'
df -h "$HOME" | tail -1

if [[ "$(uname -m)" != "arm64" ]]; then
  echo "MLX requires an Apple Silicon Mac. No installation was attempted."
  exit 2
fi

if [[ "${1:-}" != "--install" ]]; then
  echo "Preflight only. Run with --install to create the PRIVATE local MLX environment."
  exit 0
fi

for version in python3.12 python3.11 python3; do
  if command -v "$version" >/dev/null 2>&1; then
    PY="$version"; break
  fi
done
if [[ -z "${PY:-}" ]]; then
  echo "Python 3.11 or 3.12 is required. Install Python before retrying."
  exit 2
fi

"$PY" - <<'PY'
import sys
if sys.version_info[:2] not in ((3,11),(3,12)):
    raise SystemExit("Use Python 3.11 or 3.12 to install the tested MLX environment")
PY

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is required for compact MP3 reports. Install it locally before enabling the worker."
  echo "If Homebrew is installed: brew install ffmpeg"
  exit 2
fi

DEST="$HOME/Library/Application Support/HolisticHouse/AndreyVoice"
umask 077
mkdir -p "$DEST/voice_sources" "$DEST/output" "$DEST/cache"
chmod 700 "$DEST" "$DEST/voice_sources" "$DEST/output" "$DEST/cache"

if [[ ! -d "$DEST/.venv" ]]; then "$PY" -m venv "$DEST/.venv"; fi
"$DEST/.venv/bin/python" -m pip install --disable-pip-version-check --upgrade pip
"$DEST/.venv/bin/python" -m pip install --disable-pip-version-check 'mlx-audio' 'soundfile' 'numpy'

# Install only owner-operated public source code. The private WAVs, model
# weights, real client text, QA approval and Keychain token are never bundled.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
install -m 700 "$SCRIPT_DIR/local_worker.py" "$DEST/local_worker.py"
install -m 700 "$SCRIPT_DIR/launch_agent.py" "$DEST/launch_agent.py"
"$DEST/.venv/bin/python" "$DEST/launch_agent.py" --prepare

echo "MLX tools and the INACTIVE launch agent are prepared locally."
echo "NO voice model was downloaded and NO TTS request was made."
echo "Keep original RU/EN reference WAVs and transcripts privately inside $DEST/voice_sources."
echo "Run only synthetic voice tests until the owner approves the result."
echo "The Mac worker and any client report processing remain disabled."
