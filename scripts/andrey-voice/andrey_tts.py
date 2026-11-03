#!/usr/bin/env python3
"""Andrey Voice: local offline/free TTS engine for approved source references.

No client content or voice files are committed with this program.
The first run downloads open-source model weights, not paid HeyGen audio.
The owner must approve RU/EN sound on synthetic text before real reports.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MODELS = {
    "fast": "mlx-community/Qwen3-TTS-12Hz-0.6B-Base-bf16",
    "quality": "mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16",
}
WHISPER = "mlx-community/whisper-large-v3-turbo-asr-fp16"


def approved_reference(language: str, filename: str | None) -> Path:
    if filename:
        path = Path(filename).expanduser().resolve()
    else:
        basename = "en_v4_ref_12s.wav" if language == "en" else "ru_heygen_preview.wav"
        path = (ROOT / "voice_sources" / basename).resolve()
    if not path.is_file() or path.suffix.lower() != ".wav":
        raise RuntimeError("A local, private and owner-approved WAV is required")
    if path.stat().st_size < 5000:
        raise RuntimeError("Voice reference is too small")
    return path


def read_input(text: str | None, file_name: str | None) -> str:
    if bool(text) == bool(file_name):
        raise RuntimeError("Supply exactly one of --text and --text-file")
    value = Path(file_name).expanduser().read_text("utf-8") if file_name else text
    value = re.sub(r"\s+", " ", (value or "")).strip()
    if not value or len(value) > 3000 or "\0" in value:
        raise RuntimeError("Only a bounded approved text (1–3000 chars) is allowed")
    return value


def split_text(text: str, max_chars: int = 240) -> list[str]:
    words = text.split(" ")
    chunks: list[str] = []
    current = ""
    for word in words:
        if len(word) > max_chars:
            raise RuntimeError("Unsupported excessively long unbroken word")
        candidate = word if not current else current + " " + word
        if len(candidate) > max_chars and current:
            chunks.append(current)
            current = word
        else:
            current = candidate
    if current:
        chunks.append(current)
    return chunks


def hash_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(2**20), b""):
            digest.update(block)
    return digest.hexdigest()


def reference_transcript(path: Path, language: str) -> str:
    """Local STT only; no provider upload or external commercial API."""
    cache = ROOT / ".private_cache" / "reference_text"
    cache.mkdir(parents=True, exist_ok=True)
    cache.chmod(0o700)
    digest = hash_file(path)[:24]
    prefix = cache / f"{language}-{digest}"
    text_path = prefix.with_suffix(".txt")
    if text_path.is_file():
        transcript = text_path.read_text("utf-8").strip()
    else:
        subprocess.run([
            sys.executable, "-m", "mlx_audio.stt.generate",
            "--model", WHISPER, "--audio", str(path),
            "--output-path", str(prefix), "--format", "txt",
        ], check=True, timeout=420, stdout=subprocess.DEVNULL)
        transcript = text_path.read_text("utf-8").strip()
        text_path.chmod(0o600)
    if len(transcript) < 5:
        raise RuntimeError("Voice source transcript is unexpectedly short")
    return transcript


def main() -> None:
    parser = argparse.ArgumentParser(description="Local Andrey RU/EN voice cloning")
    parser.add_argument("--language", required=True, choices=("ru", "en"))
    inp = parser.add_mutually_exclusive_group(required=True)
    inp.add_argument("--text")
    inp.add_argument("--text-file", help="Use /dev/stdin from the private Mac worker")
    parser.add_argument("--reference")
    parser.add_argument("--ref-text", help="Exact words spoken in reference audio")
    parser.add_argument("--model", choices=tuple(MODELS), default="fast")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    text = read_input(args.text, args.text_file)
    reference = approved_reference(args.language, args.reference)
    output = Path(args.output).expanduser().resolve()
    if output.suffix.lower() != ".wav" or output == reference:
        raise RuntimeError("Output must be a distinct local .wav file")
    output.parent.mkdir(parents=True, exist_ok=True)

    ref_text = (args.ref_text or "").strip() or reference_transcript(reference, args.language)
    from mlx_audio.tts.utils import load_model
    import numpy as np
    import soundfile as sf

    model = load_model(MODELS[args.model])
    audio_parts = []
    sample_rate = None
    chunks = split_text(text)
    for index, chunk in enumerate(chunks):
        results = list(model.generate(
            text=chunk, ref_audio=str(reference), ref_text=ref_text,
        ))
        if not results:
            raise RuntimeError("Local TTS generation returned no audio")
        for result in results:
            audio = np.asarray(result.audio).reshape(-1)
            rate = int(result.sample_rate)
            if sample_rate is not None and rate != sample_rate:
                raise RuntimeError("Local TTS generated inconsistent sample rates")
            sample_rate = rate
            if audio.size:
                audio_parts.append(audio)
        if index + 1 < len(chunks):
            audio_parts.append(np.zeros(int(sample_rate * 0.18), dtype=np.float32))

    if not audio_parts or sample_rate is None:
        raise RuntimeError("No audio generated")
    rendered = np.concatenate(audio_parts)
    sf.write(output, np.clip(rendered, -1.0, 1.0), sample_rate, subtype="PCM_16")
    print(json.dumps({
        "status": "local_audio_ready",
        "duration_seconds": round(rendered.size / sample_rate, 2),
        "language": args.language,
        "model": MODELS[args.model],
    }))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Do not leak private medical text, reference paths or provider URLs
        # to login/session logs or the UI when a synthetic test fails.
        print("Local Andrey voice generation failed; check private QA logs.", file=sys.stderr)
        raise SystemExit(1)
