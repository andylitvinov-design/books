#!/usr/bin/env python3
"""Local-only Whisper benchmark. No model downloads, API credentials or cloud requests."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import time
import wave


def load_clips(root):
    root = Path(root).resolve()
    fixtures = json.loads((root / 'fixtures.json').read_text(encoding='utf-8'))['fixtures']
    records = json.loads((root / 'audio' / 'manifest.json').read_text(encoding='utf-8'))['records']
    refs = {f['id']: f for f in fixtures}
    if not refs or len(refs) != len(fixtures) or len(records) != len(refs):
        raise ValueError('FIXTURE_COUNT_MISMATCH')
    clips, seen = [], set()
    for row in records:
        key = row['id']
        if key in seen or key not in refs or row['locale'] not in ('ru', 'en', 'es'):
            raise ValueError('INVALID_FIXTURE_ID')
        seen.add(key)
        ref = refs[key]
        if row['locale'] != ref['locale'] or row['reference'] != ref['reference']:
            raise ValueError('REFERENCE_MISMATCH')
        filename = row['file']
        if filename != key + '.wav' or Path(filename).name != filename:
            raise ValueError('INVALID_AUDIO_PATH')
        path = (root / 'audio' / filename).resolve()
        if path.parent != (root / 'audio').resolve():
            raise ValueError('INVALID_AUDIO_PATH')
        sha = hashlib.sha256(path.read_bytes()).hexdigest()
        if sha != row['audioId']:
            raise ValueError('AUDIO_HASH_MISMATCH')
        with wave.open(str(path), 'rb') as wav:
            if (wav.getnchannels(), wav.getsampwidth(), wav.getframerate(), wav.getcomptype()) != (1, 2, 16000, 'NONE') or not wav.getnframes():
                raise ValueError('INVALID_AUDIO_FORMAT')
        clips.append((key, row['locale'], sha, path))
    return clips


def run_model(clips, transcribe, label, auto=False):
    results = []
    for key, locale, sha, path in clips:
        start = time.monotonic()
        text = None
        try:
            value = transcribe(path, None if auto else locale)
            if isinstance(value, str) and value.strip():
                text = value.strip()
        except Exception:
            # Never print provider errors or transcript text; count explicit misses.
            pass
        results.append({'id': key, 'audioId': sha, 'text': text,
                        'latencyMs': round((time.monotonic() - start) * 1000, 2)})
    return {'name': label, 'results': results}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('corpus', type=Path, help='Extracted benchmark directory')
    parser.add_argument('--check-only', action='store_true')
    parser.add_argument('--model-dir', type=Path, help='Existing local CTranslate2 Whisper weights')
    parser.add_argument('--name', help='Model/version label, e.g. large-v3-local')
    parser.add_argument('--output', type=Path)
    parser.add_argument('--auto', action='store_true', help='Evaluate language auto-detection instead of hints')
    args = parser.parse_args()
    clips = load_clips(args.corpus)
    if args.check_only:
        print(json.dumps({'validatedClips': len(clips), 'modelExecuted': False}))
        return
    if not args.model_dir or not args.name or not args.output:
        parser.error('--model-dir, --name and --output required unless --check-only')
    model_path = args.model_dir.resolve()
    if not model_path.is_dir() or not all((model_path / f).is_file() for f in ('model.bin', 'config.json', 'tokenizer.json')):
        parser.error('LOCAL_MODEL_FILES_MISSING; no download attempted')
    for key in ('HF_HUB_OFFLINE', 'TRANSFORMERS_OFFLINE', 'HF_DATASETS_OFFLINE'):
        os.environ[key] = '1'
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        parser.error('LOCAL_FASTER_WHISPER_MISSING; no installation attempted')
    model = WhisperModel(str(model_path), device='cpu', compute_type='int8', local_files_only=True)

    def transcribe(path, language):
        segments, _ = model.transcribe(str(path), language=language, task='transcribe', beam_size=5,
                                       condition_on_previous_text=False, vad_filter=False)
        return ' '.join(s.text.strip() for s in segments)

    result = run_model(clips, transcribe, args.name, args.auto)
    with args.output.open('x', encoding='utf-8') as out:
        json.dump(result, out, ensure_ascii=False, indent=2)
    print(json.dumps({'validatedClips': len(clips), 'recognizedClips': sum(bool(r['text']) for r in result['results']), 'modelExecuted': True}))


if __name__ == '__main__':
    main()
