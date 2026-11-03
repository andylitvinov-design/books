#!/usr/bin/env python3
"""Private voice-reference format/signal audit; no network, inference or transcription.

The tool NEVER uploads audio, generates voice models or reads client reports.
Use it on owned source/reference WAVs before local MLX synthesis.
"""
from __future__ import annotations
import argparse
from array import array
from pathlib import Path
import json
import math
import sys
import wave


def audit_wav(path: Path) -> dict:
    if not path.is_file() or path.suffix.lower() != ".wav":
        raise ValueError("A local .wav file is required")
    with wave.open(str(path), "rb") as audio:
        channels = audio.getnchannels()
        sample_rate = audio.getframerate()
        sample_width = audio.getsampwidth()
        frames = audio.getnframes()
        compression = audio.getcomptype()
        if compression != "NONE" or channels != 1 or sample_width != 2 or not 8000 <= sample_rate <= 192000:
            raise ValueError("Reference must be uncompressed 16-bit mono PCM WAV at 8–192 kHz")
        if frames <= 0:
            raise ValueError("Empty WAV")
        # Streaming one-second blocks avoids loading full private reference into memory.
        max_sample, clipped, count, total_square, silent_seconds = 0, 0, 0, 0, 0
        active_seconds = 0
        while True:
            raw = audio.readframes(sample_rate)
            if not raw:
                break
            samples = array("h")
            samples.frombytes(raw)
            if sys.byteorder != "little":
                samples.byteswap()
            if not samples:
                break
            peak = max(abs(x) for x in samples)
            max_sample = max(max_sample, peak)
            clipped += sum(abs(x) >= 32700 for x in samples)
            squares = sum(int(x) ** 2 for x in samples)
            total_square += squares
            count += len(samples)
            rms = math.sqrt(squares / len(samples)) / 32768
            if rms < 10 ** (-45 / 20):
                silent_seconds += 1
            else:
                active_seconds += 1
    seconds = frames / sample_rate
    rms = math.sqrt(total_square / max(1, count)) / 32768
    return {
        "duration_seconds": round(seconds, 2),
        "sample_rate_hz": sample_rate,
        "channels": channels,
        "pcm_bits": sample_width * 8,
        "peak_dbfs": round(20 * math.log10(max(max_sample / 32768, 1e-9)), 1),
        "rms_dbfs": round(20 * math.log10(max(rms, 1e-9)), 1),
        "clipped_samples": clipped,
        "clipped_fraction": round(clipped / count, 7),
        "active_seconds_estimate": active_seconds,
        "silent_seconds_estimate": silent_seconds,
        "suitable_length_5_to_15_seconds": 5 <= seconds <= 15,
        "no_detected_clipping": clipped == 0,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("wav", type=Path)
    parser.add_argument("--strict", action="store_true",
                        help="Require a clean 5–15 second synthesis reference")
    args = parser.parse_args()
    try:
        result = audit_wav(args.wav)
    except (ValueError, OSError, EOFError, wave.Error) as exc:
        print(json.dumps({"status": "invalid", "reason": str(exc)}))
        return 2
    result["status"] = "checked"
    print(json.dumps(result, sort_keys=True))
    if args.strict and (not result["suitable_length_5_to_15_seconds"] or
                        not result["no_detected_clipping"] or
                        result["active_seconds_estimate"] < 3):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
