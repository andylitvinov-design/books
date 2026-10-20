#!/usr/bin/env python3
"""Prepare an owner-only LaunchAgent; NEVER enable real client work automatically.

An approved quality marker and a Keychain token are required to activate.
The agent polls the protected site only while the Mac is on and logged in.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import plistlib
import subprocess
import sys

LABEL = "com.holistichouse.andrey-voice"
HOME = Path.home() / "Library" / "Application Support" / "HolisticHouse" / "AndreyVoice"
PREPARED = HOME / "launch-agent.plist"
INSTALLED = Path.home() / "Library" / "LaunchAgents" / (LABEL + ".plist")


def specification(home: Path = HOME) -> dict:
    log_dir = home / "logs"
    return {
        "Label": LABEL,
        "ProgramArguments": [
            str(home / ".venv" / "bin" / "python"),
            str(home / "local_worker.py"),
            "--once",
        ],
        "WorkingDirectory": str(home),
        "RunAtLoad": True,
        "StartInterval": 300,
        "StandardOutPath": str(log_dir / "worker.log"),
        "StandardErrorPath": str(log_dir / "worker-error.log"),
        "ProcessType": "Background",
    }


def no_secrets(data: dict) -> bool:
    serialized = json.dumps(data)
    return not any(key in serialized for key in (
        "HH_LOCAL_NARRATION_WORKER_TOKEN", "Bearer ", "password",
        "HEYGEN_API_KEY", "HH_APP_ENCRYPTION_KEY",
    ))


def prepare() -> Path:
    if sys.platform != "darwin":
        raise RuntimeError("LaunchAgent must be installed on macOS")
    HOME.mkdir(parents=True, exist_ok=True)
    (HOME / "logs").mkdir(parents=True, exist_ok=True)
    os.chmod(HOME, 0o700)
    os.chmod(HOME / "logs", 0o700)
    profile = specification()
    if not no_secrets(profile):
        raise RuntimeError("Refusing to write secrets to launchd")
    with PREPARED.open("wb") as stream:
        plistlib.dump(profile, stream)
    PREPARED.chmod(0o600)
    return PREPARED


def activate() -> None:
    if not (HOME / "owner_voice_qa_approved.json").is_file():
        raise RuntimeError("RU/EN voice quality has not been owner-approved")
    for filename in (
        HOME / ".venv" / "bin" / "python",
        HOME / "local_worker.py",
        HOME / "andrey_tts.py",
        HOME / "voice_sources" / "en_v4_ref_12s.wav",
        HOME / "voice_sources" / "ru_heygen_preview.wav",
    ):
        if not filename.is_file():
            raise RuntimeError("Missing local voice file; worker must remain inactive")
    # The site still requires three separate server-side activation flags.
    result = subprocess.run(
        ["/usr/bin/security", "find-generic-password",
         "-s", "holistichouse.andrey-voice.worker-token",
         "-a", "AndreyVoice", "-w"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=8,
        check=False,
    )
    if result.returncode:
        raise RuntimeError("Owner Keychain worker credential not configured")
    prepare()
    INSTALLED.parent.mkdir(parents=True, exist_ok=True)
    INSTALLED.write_bytes(PREPARED.read_bytes())
    INSTALLED.chmod(0o600)
    uid = str(os.getuid())
    subprocess.run(["/bin/launchctl", "bootstrap", "gui/" + uid, str(INSTALLED)],
                   check=True, timeout=12)


def deactivate() -> None:
    if INSTALLED.is_file():
        subprocess.run(["/bin/launchctl", "bootout", "gui/" + str(os.getuid()), str(INSTALLED)],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                       timeout=10, check=False)
        INSTALLED.unlink()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--prepare", action="store_true", help="Write inactive agent plist only")
    group.add_argument("--enable", action="store_true", help="Requires verified owner voice QA and Keychain")
    group.add_argument("--disable", action="store_true", help="Stop and remove agent")
    args = parser.parse_args()
    try:
        if args.prepare:
            print("Inactive LaunchAgent prepared:", prepare())
        elif args.enable:
            activate()
            print("LaunchAgent installed; site activation still requires independent QA.")
        else:
            deactivate()
            print("LaunchAgent disabled.")
    except (RuntimeError, OSError, subprocess.CalledProcessError) as error:
        print("LaunchAgent not activated:", error, file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
