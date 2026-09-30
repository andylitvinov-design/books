"""Translate only the already-public English remedy copy on a work branch.
No client records, secrets, external translation API, or production writes.
The open-source model runs locally on the CI runner. Keep original references,
Latin remedy names and all numbers verbatim; publish only after review.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile
import urllib.request
import zipfile

import ctranslate2
import sentencepiece as spm

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'content/remedies/en'
OUTPUT = ROOT / 'data/spanish-remedies.json'
MODEL_URL = 'https://argos-net.com/v1/translate-en_es-1_0.argosmodel'
FIELDS = ('description', 'source_substance', 'key_image', 'main_state', 'observed_effect', 'archetype', 'shadow', 'resource', 'internal_conflict', 'developmental_stage', 'subpersonality', 'transformation', 'meanings_lessons', 'alchemical_interpretation', 'practical_observations', 'cases', 'comparisons', 'primary_image_alt')
assert SOURCE.is_dir()
records = []
for file in sorted(SOURCE.glob('*.md')):
    raw = file.read_text(encoding='utf-8')
    match = re.fullmatch(r'---\n([\s\S]*?)\n---\n([\s\S]+)', raw)
    assert match, file.name
    meta = dict(line.split(':', 1) for line in match[1].splitlines() if ':' in line)
    meta = {k: v.strip() for k, v in meta.items()}
    meta['description'] = match[2].strip()
    meta['_sourceHash'] = hashlib.sha256(raw.encode()).hexdigest()
    records.append(meta)
assert records and len(records) < 1000
names = sorted({r['canonical_latin_name'] for r in records}, key=len, reverse=True)
protected = re.compile('(' + '|'.join(re.escape(n) for n in names) + r'|https?://[^\s)<>]+|message\d+|\b\d+(?:[.,:/-]\d+)*(?:[A-Za-z]+)?\b|\*\*|`[^`]*`)')
manual = {
    'Additional materials and observations': 'Materiales y observaciones adicionales',
    'Additional author materials from Telegram': 'Materiales adicionales del autor en Telegram',
    'Main state': 'Estado principal', 'Indications': 'Indicaciones', 'State': 'Estado',
    'Basis': 'Base', 'Effect': 'Efecto', 'Image': 'Imagen', 'Images': 'Imágenes',
    'Archetype': 'Arquetipo', 'Archetypes': 'Arquetipos', 'Idea': 'Idea',
    'Shadow': 'Sombra', 'Resource': 'Recurso', 'Inner conflict': 'Conflicto interior',
    'Internal conflict': 'Conflicto interior', 'Developmental stage': 'Etapa del desarrollo',
    'Subpersonality': 'Subpersonalidad', 'Meanings': 'Significados', 'Lesson': 'Aprendizaje',
    'Lessons': 'Aprendizajes', 'Transformation': 'Transformación',
    'Alchemical interpretation': 'Interpretación alquímica',
    'Practical observations': 'Observaciones prácticas', 'Cases': 'Casos',
    'Comparisons': 'Comparaciones', 'Essence': 'Esencia',
    'case.': 'caso.', 'comparison.': 'comparación.', 'thematic mention.': 'mención temática.',
    'case (with comparisons).': 'caso (con comparaciones).',
}
cache = dict(manual)
with tempfile.TemporaryDirectory(prefix='spanish-public-copy-') as tmp:
    tmp = Path(tmp)
    archive = tmp / 'model.zip'
    with urllib.request.urlopen(MODEL_URL, timeout=120) as response, archive.open('wb') as out:
        while block := response.read(1024 * 1024):
            out.write(block)
    model_hash = hashlib.sha256(archive.read_bytes()).hexdigest()
    with zipfile.ZipFile(archive) as z:
        for item in z.infolist():
            target = (tmp / item.filename).resolve()
            assert target.is_relative_to(tmp.resolve()) and not item.is_dir() or target.is_relative_to(tmp.resolve())
            assert not item.filename.startswith('/')
        z.extractall(tmp)
    sp_path = next(tmp.rglob('sentencepiece.model'))
    model_dir = next(tmp.rglob('model.bin')).parent
    processor = spm.SentencePieceProcessor(model_file=str(sp_path))
    translator = ctranslate2.Translator(str(model_dir), device='cpu', compute_type='int8', inter_threads=2, intra_threads=2)

    def phrase(text):
        lead = text[:len(text) - len(text.lstrip())]
        tail = text[len(text.rstrip()):]
        core = text.strip()
        if not core or not re.search('[A-Za-z]{2}', core):
            return text
        if core not in cache:
            tokens = processor.encode(core, out_type=str)
            # Do not silently truncate long paragraphs.
            if len(tokens) > 240:
                pieces = re.split(r'(?<=[.!?;])\s+', core)
                if len(pieces) == 1:
                    words = core.split()
                    pieces = [' '.join(words[i:i+80]) for i in range(0, len(words), 80)]
                cache[core] = ' '.join(phrase(p).strip() for p in pieces)
            else:
                result = translator.translate_batch([tokens], beam_size=3, max_decoding_length=512)[0]
                value = processor.decode(result.hypotheses[0]).strip()
                assert value and '<unk>' not in value, core
                assert len(result.hypotheses[0]) < 512, 'Possible truncated output'
                cache[core] = value
        return lead + cache[core] + tail

    def line(value):
        if not value.strip():
            return value
        prefix = re.match(r'^(?:#{1,6}\s+|[-*•]\s+|>\s*)', value)
        start = prefix.group() if prefix else ''
        body = value[len(start):]
        parts = protected.split(body)
        translated = ''.join(part if i % 2 else phrase(part) for i, part in enumerate(parts))
        assert protected.findall(body) == protected.findall(translated), 'Protected terms changed'
        return start + translated

    entries = {}
    for index, record in enumerate(records):
        translated = {field: '\n'.join(line(v) for v in record[field].split('\n')) for field in FIELDS if record.get(field)}
        entries[record['slug']] = {'sourceSha256': record['_sourceHash'], 'fields': translated}
        print(f"Translated {index + 1}/{len(records)}: {record['slug']}", flush=True)
    result = {'schemaVersion': 1, 'sourceLocale': 'en', 'targetLocale': 'es', 'method': 'offline-argos-en-es-1.0-with-protected-references', 'modelUrl': MODEL_URL, 'modelSha256': model_hash, 'entries': entries}
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    report = {'remedies': len(entries), 'sourceFiles': len(records), 'translatedFields': sum(len(x['fields']) for x in entries.values()), 'translatedCharacters': sum(len(v) for x in entries.values() for v in x['fields'].values()), 'modelSha256': model_hash, 'protectedValues': 'verified per line', 'editorialReview': 'required before merge', 'externalTranslationApi': False}
    (ROOT / 'spanish-translation-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))
