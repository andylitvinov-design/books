#!/usr/bin/env python3
"""Generate public authored synthetic speech locally. No cloud or model download."""
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import wave
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    source = Path(__file__).resolve().parents[1] / 'tests/fixtures/coach-speech-benchmark-v1.json'
    fixtures = json.loads(source.read_text(encoding='utf-8'))['fixtures']
    if not fixtures or len({r['id'] for r in fixtures}) != len(fixtures):
        raise ValueError('INVALID_FIXTURES')
    voice = {'ru': 'ru', 'en': 'en-us', 'es': 'es'}
    engine = shutil.which('espeak-ng') or shutil.which('espeak')
    ffmpeg = shutil.which('ffmpeg')
    if not engine or not ffmpeg:
        raise RuntimeError('LOCAL_ESPEAK_AND_FFMPEG_REQUIRED')
    root = args.output.resolve()
    root.mkdir(parents=True, exist_ok=False)
    audio = root / 'audio'
    audio.mkdir()
    records = []
    for row in fixtures:
        key, locale, reference = row['id'], row['locale'], row['reference']
        if not re.fullmatch(r'[a-z0-9-]{1,80}', key) or locale not in voice or not reference.strip():
            raise ValueError('INVALID_FIXTURE')
        # Fixed synthetic voice and speed; reference is used ONLY to generate the test audio.
        data = subprocess.run([engine, '-v', voice[locale], '-s', '155', '--stdin', '--stdout'],
                              input=reference.encode('utf-8'), stdout=subprocess.PIPE,
                              stderr=subprocess.PIPE, check=True, timeout=15).stdout
        pcm = subprocess.run([ffmpeg, '-v', 'error', '-f', 'wav', '-i', 'pipe:0',
                              '-ac', '1', '-ar', '16000', '-f', 's16le', 'pipe:1'],
                             input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                             check=True, timeout=15).stdout
        if len(pcm) < 3200 or len(pcm) > 480000 or len(pcm) % 2:
            raise ValueError('INVALID_SYNTHETIC_DURATION')
        path = audio / (key + '.wav')
        with wave.open(str(path), 'wb') as out:
            out.setnchannels(1)
            out.setsampwidth(2)
            out.setframerate(16000)
            out.writeframes(pcm)
        records.append({'id': key, 'locale': locale, 'reference': reference,
                        'file': path.name, 'audioId': hashlib.sha256(path.read_bytes()).hexdigest()})
    (root / 'fixtures.json').write_bytes(source.read_bytes())
    (audio / 'manifest.json').write_text(json.dumps({'source':'authored-synthetic-espeak','records':records}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'syntheticClips':len(records),'modelExecuted':False,'networkRequests':0}))

if __name__ == '__main__':
    main()
