#!/usr/bin/env python3
"""Owner-only Mac voice worker. No paid TTS APIs and no client-side AI downloads.

Fail-closed until a verified site worker API, private credentials, local MLX
engine, approved voice samples and consent are configured. This file contains
NO real credentials, voice recordings, model weights or patient information.
"""
from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time
from urllib.parse import urlsplit
from urllib.error import HTTPError, URLError
from urllib.request import Request, build_opener, HTTPRedirectHandler

MAX_AUDIO_BYTES = 3_000_000
JOB_ID = re.compile(r"^[a-f0-9-]{36}$", re.I)
PRODUCTION_SITE = "https://holistichouse.vercel.app"
# Nonsecret storage host is verified against the site's Supabase project.
PRODUCTION_STORAGE_HOST = "shervdixkaxurnaecioe.supabase.co"
VOICE_HOME = Path.home() / "Library" / "Application Support" / "HolisticHouse" / "AndreyVoice"
KEYCHAIN_SERVICE = "holistichouse.andrey-voice.worker-token"
VALID_LOCALES = {"ru", "en"}


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError("HTTP redirects forbidden for private worker requests")


OPEN = build_opener(NoRedirect)


def base_url() -> str:
    url = os.environ.get("HH_VOICE_SITE_URL", PRODUCTION_SITE).rstrip("/")
    parts = urlsplit(url)
    if parts.scheme != "https" or parts.username or parts.password or parts.query or parts.fragment:
        raise ValueError("site origin must be https")
    if parts.path not in ("", "/") or not parts.hostname:
        raise ValueError("site origin must be a plain hostname")
    if parts.hostname != "holistichouse.vercel.app":
        raise ValueError("unapproved site origin")
    return url


def api_token() -> str:
    token = os.environ.get("HH_LOCAL_NARRATION_WORKER_TOKEN", "")
    if not token and sys.platform == "darwin":
        # Secret lives in the owner's macOS Keychain, never in a launchd plist,
        # downloaded zip, Git repository or script command line.
        try:
            token = subprocess.check_output(
                ["/usr/bin/security", "find-generic-password",
                 "-s", KEYCHAIN_SERVICE, "-a", "AndreyVoice", "-w"],
                stderr=subprocess.DEVNULL, timeout=8
            ).decode("utf-8").strip()
        except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
            token = ""
    if len(token) < 40 or len(token) > 200 or any(ch.isspace() for ch in token):
        raise ValueError("secure worker token not configured")
    return token


def api_post(path: str, body: dict, *, authorized: bool = True) -> dict:
    if path not in {
        "/api/report-narration/local/worker/claim",
        "/api/report-narration/local/worker/complete",
        "/api/report-narration/local/worker/failed",
    }:
        raise ValueError("worker path is not allowlisted")
    data = json.dumps(body, separators=(",", ":")).encode()
    if len(data) > 2048:
        raise ValueError("worker API request too large")
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if authorized:
        headers["Authorization"] = "Bearer " + api_token()
    request = Request(base_url() + path, data=data, headers=headers, method="POST")
    with OPEN.open(request, timeout=30) as response:
        if response.status != 200:
            raise ValueError("site worker endpoint not ready")
        payload = response.read(16_384)
        if response.read(1):
            raise ValueError("site worker response too long")
    result = json.loads(payload)
    if not isinstance(result, dict):
        raise ValueError("invalid worker response")
    return result


def approved_upload_url(url: str) -> str:
    parts = urlsplit(url)
    if parts.scheme != "https" or parts.username or parts.password or parts.fragment:
        raise ValueError("upload URL not secure")
    host = parts.hostname or ""
    approved_host = os.environ.get(
        "HH_LOCAL_NARRATION_SUPABASE_HOST", PRODUCTION_STORAGE_HOST
    ).lower().strip()
    if not approved_host.endswith(".supabase.co") or host.lower() != approved_host or parts.port not in (None, 443):
        raise ValueError("upload host does not match verified private Supabase storage")
    if not parts.path.startswith("/storage/v1/object/upload/sign/hh-client-private-media/"):
        raise ValueError("upload URL not scoped to approved private bucket")
    if "token=" not in parts.query:
        raise ValueError("missing signed upload token")
    return url


def verify_mp3(path: Path) -> tuple[int, str]:
    size = path.stat().st_size
    if size < 128 or size > MAX_AUDIO_BYTES:
        raise ValueError("MP3 size outside safe bound")
    with path.open("rb") as audio:
        header = audio.read(3)
    if not (header == b"ID3" or (header[0] == 255 and (header[1] & 224) == 224)):
        raise ValueError("not a recognizable MP3 file")
    digest = hashlib.sha256()
    with path.open("rb") as audio:
        for chunk in iter(lambda: audio.read(65_536), b""):
            digest.update(chunk)
    return size, digest.hexdigest()


def put_signed_mp3(url: str, path: Path) -> None:
    url = approved_upload_url(url)
    size, _ = verify_mp3(path)
    # urllib's no-redirect handler avoids sending the signed token elsewhere.
    with path.open("rb") as source:
        request = Request(url, data=source.read(), method="PUT",
                          headers={"Content-Type": "audio/mpeg",
                                   "Content-Length": str(size),
                                   "x-upsert": "false"})
    with OPEN.open(request, timeout=60) as result:
        if result.status not in (200, 201):
            raise ValueError("private audio upload was not acknowledged")
        result.read(1024)


def run_local_engine(language: str, text: str, out: Path, scratch: Path) -> None:
    script = Path(os.environ.get(
        "HH_VOICE_ENGINE_SCRIPT", str(VOICE_HOME / "andrey_tts.py")
    )).expanduser()
    if not script.is_file() or script.name != "andrey_tts.py":
        raise ValueError("owner-approved local synthesizer is not installed")
    reference_var = "HH_VOICE_REFERENCE_RU" if language == "ru" else "HH_VOICE_REFERENCE_EN"
    default_name = "ru_heygen_preview.wav" if language == "ru" else "en_v4_ref_12s.wav"
    reference = Path(os.environ.get(
        reference_var, str(VOICE_HOME / "voice_sources" / default_name)
    )).expanduser()
    if not reference.is_file() or reference.suffix.lower() != ".wav":
        raise ValueError("private language reference missing")
    # The CLI can read `--text-file /dev/stdin` on macOS. Feeding the
    # approved report over a private subprocess pipe avoids leaving a clinical
    # plaintext text file behind when the Mac sleeps or loses power.
    wav = scratch / "narration.wav"
    args = [sys.executable, str(script), "--language", language,
            "--text-file", "/dev/stdin", "--reference", str(reference),
            "--model", os.environ.get("HH_VOICE_MODEL", "fast"),
            "--output", str(wav)]
    transcript_var = "HH_VOICE_REFERENCE_TRANSCRIPT_RU" if language == "ru" else "HH_VOICE_REFERENCE_TRANSCRIPT_EN"
    reference_text = os.environ.get(transcript_var, "")
    if reference_text:
        args += ["--ref-text", reference_text]
    subprocess.run(args, input=text.encode("utf-8"),
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                   check=True, timeout=720)
    if not wav.is_file() or wav.stat().st_size <= 128:
        raise ValueError("local model produced no WAV")
    subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error",
                    "-y", "-i", str(wav), "-vn", "-ac", "1",
                    "-ar", "24000", "-codec:a", "libmp3lame", "-b:a", "48k",
                    str(out)],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                   check=True, timeout=90)
    verify_mp3(out)


def process_one() -> bool:
    claim = api_post("/api/report-narration/local/worker/claim", {})
    job = claim.get("job")
    if job is None:
        return False
    if not isinstance(job, dict) or set(job) != {
        "id", "leaseId", "language", "text", "uploadUrl"
    }:
        raise ValueError("invalid site worker contract")
    if not JOB_ID.fullmatch(job["id"]) or not JOB_ID.fullmatch(job["leaseId"]):
        raise ValueError("invalid job ID")
    if job["language"] not in VALID_LOCALES or not isinstance(job["text"], str) or not 1 <= len(job["text"]) <= 3000:
        raise ValueError("invalid approved text envelope")
    approved_upload_url(job["uploadUrl"])
    # Private report bytes exist only in this temporary directory, always deleted.
    with tempfile.TemporaryDirectory(prefix="andrey-voice-") as name:
        scratch = Path(name)
        scratch.chmod(0o700)
        output = scratch / "narration.mp3"
        try:
            run_local_engine(job["language"], job["text"], output, scratch)
            size, sha = verify_mp3(output)
            put_signed_mp3(job["uploadUrl"], output)
            result = api_post("/api/report-narration/local/worker/complete", {
                "id": job["id"], "leaseId": job["leaseId"],
                "mime": "audio/mpeg", "bytes": size, "sha256": sha
            })
            if result.get("status") != "ready":
                raise ValueError("completion verification failed")
        except Exception:
            # Never transmit private text, local paths or raw provider errors.
            try:
                api_post("/api/report-narration/local/worker/failed", {
                    "id": job["id"], "leaseId": job["leaseId"]
                })
            except Exception:
                pass
            raise
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Free private Mac voice worker")
    parser.add_argument("--once", action="store_true", help="Claim at most one job")
    parser.add_argument("--loop", action="store_true", help="Poll while Mac is awake")
    parser.add_argument("--check", action="store_true", help="Check installation only, no server calls")
    args = parser.parse_args()
    if sum([args.once, args.loop, args.check]) != 1:
        parser.error("choose --check, --once or --loop")
    if args.check:
        print(json.dumps({
            "status": "local_config_check",
            "python": sys.version.split()[0],
            "site": PRODUCTION_SITE,
            "engine_configured": Path(os.environ.get(
                "HH_VOICE_ENGINE_SCRIPT", str(VOICE_HOME / "andrey_tts.py"))).is_file(),
            "english_reference_exists": Path(os.environ.get(
                "HH_VOICE_REFERENCE_EN", str(VOICE_HOME / "voice_sources" / "en_v4_ref_12s.wav"))).is_file(),
            "russian_reference_exists": Path(os.environ.get(
                "HH_VOICE_REFERENCE_RU", str(VOICE_HOME / "voice_sources" / "ru_heygen_preview.wav"))).is_file(),
            "token_in_environment": len(os.environ.get("HH_LOCAL_NARRATION_WORKER_TOKEN", "")) >= 40,
            "token_may_be_in_keychain": sys.platform == "darwin",
        }))
        return 0
    api_token()
    lockfile = Path.home() / ".andrey-voice-worker.lock"
    with lockfile.open("a+") as handle:
        handle.chmod(0o600)
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print("Another Andrey voice worker is active.", file=sys.stderr)
            return 2
        while True:
            try:
                worked = process_one()
                print("one job completed" if worked else "no pending jobs")
            except (HTTPError, URLError, ValueError, subprocess.CalledProcessError,
                    subprocess.TimeoutExpired, OSError) as exc:
                # Do not print URLs, tokens or clinical data from exception.
                print("worker unavailable or job failed; retry later", file=sys.stderr)
                if args.once:
                    return 1
            if args.once:
                break
            time.sleep(30)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
