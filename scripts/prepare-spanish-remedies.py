"""Offline translation of already-public remedy copy; no client data or API keys.
Writes a reviewable Spanish data file on the work branch only. Source IDs, Latin
names, links and numerical values are protected, and source hashes are recorded.
"""
import hashlib
import json
from pathlib import Path
import re
import tempfile

import ctranslate2
from huggingface_hub import snapshot_download
from transformers import MarianTokenizer

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'content/remedies/en'
OUTPUT = ROOT / 'data/spanish-remedies.json'
MODEL = 'Helsinki-NLP/opus-mt-en-es'
REVISION = 'f10bb6c27d33d69a18eddb2371b9a4cc0963b6c0'
FIELDS = ('description', 'source_substance', 'key_image', 'main_state', 'observed_effect', 'archetype', 'shadow', 'resource', 'internal_conflict', 'developmental_stage', 'subpersonality', 'transformation', 'meanings_lessons', 'alchemical_interpretation', 'practical_observations', 'cases', 'comparisons', 'primary_image_alt')
records = []
for file in sorted(SOURCE.glob('*.md')):
    raw = file.read_text(encoding='utf-8')
    match = re.fullmatch(r'---\n([\s\S]*?)\n---\n([\s\S]+)', raw)
    assert match, file.name
    meta = {k: v.strip() for k, v in (line.split(':', 1) for line in match[1].splitlines() if ':' in line)}
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
    source_model = snapshot_download(MODEL, revision=REVISION, allow_patterns=['*.json', '*.spm', 'pytorch_model.bin'], local_dir=str(Path(tmp) / 'source'))
    tokenizer = MarianTokenizer.from_pretrained(source_model, local_files_only=True)
    converted = str(Path(tmp) / 'converted')
    ctranslate2.converters.TransformersConverter(source_model).convert(converted, quantization='int8')
    translator = ctranslate2.Translator(converted, device='cpu', compute_type='int8', inter_threads=2, intra_threads=2)

    def phrase(text):
        lead = text[:len(text) - len(text.lstrip())]
        tail = text[len(text.rstrip()):]
        core = text.strip()
        if not core or not re.search('[A-Za-z]{2}', core): return text
        if core not in cache:
            ids = tokenizer.encode(core)
            if len(ids) > 220:
                words = core.split()
                size = max(1, min(60, len(words) // 2))
                pieces = [' '.join(words[i:i+size]) for i in range(0, len(words), size)]
                assert len(pieces) > 1, 'Unsplit long token sequence'
                cache[core] = ' '.join(phrase(p).strip() for p in pieces)
            else:
                result = translator.translate_batch([tokenizer.convert_ids_to_tokens(ids)], beam_size=3, max_decoding_length=512)[0]
                value = tokenizer.decode(tokenizer.convert_tokens_to_ids(result.hypotheses[0]), skip_special_tokens=True).strip()
                assert value and len(result.hypotheses[0]) < 512, 'Empty or truncated translation'
                cache[core] = value
        return lead + cache[core] + tail

    def line(value):
        if not value.strip(): return value
        prefix = re.match(r'^(?:#{1,6}\s+|[-*•]\s+|>\s*)', value)
        start = prefix.group() if prefix else ''
        body = value[len(start):]
        if body in manual: return start + manual[body]
        parts = protected.split(body)
        translated = ''.join(part if i % 2 else phrase(part) for i, part in enumerate(parts))
        # Keep the protected tokens in their original order. A translation may
        # legitimately introduce a word equal to another Latin catalog name.
        cursor = 0
        for token in protected.findall(body):
            found = translated.find(token, cursor)
            assert found >= 0, 'Protected source value lost'
            cursor = found + len(token)
        src_numbers = re.findall(r'\d+(?:[.,:/-]\d+)*', body)
        dst_numbers = re.findall(r'\d+(?:[.,:/-]\d+)*', translated)
        assert src_numbers == dst_numbers, f'Numerical values changed: {body!r} -> {translated!r}'
        return start + translated

    entries = {}
    for index, record in enumerate(records):
        fields = {field: '\n'.join(line(v) for v in record[field].split('\n')) for field in FIELDS if record.get(field)}
        entries[record['slug']] = {'sourceSha256': record['_sourceHash'], 'fields': fields}
        print(f"Translated {index+1}/{len(records)}: {record['slug']}", flush=True)
        result = {'schemaVersion': 1, 'sourceLocale': 'en', 'targetLocale': 'es', 'method': 'offline-opus-mt-en-es-with-protected-references', 'model': MODEL, 'modelRevision': REVISION, 'entries': entries}
        OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    report = {'remedies': len(entries), 'sourceFiles': len(records), 'translatedFields': sum(len(x['fields']) for x in entries.values()), 'translatedCharacters': sum(len(v) for x in entries.values() for v in x['fields'].values()), 'modelRevision': REVISION, 'protectedValues': 'verified per line', 'editorialReview': 'required before merge', 'externalTranslationApi': False}
    (ROOT / 'spanish-translation-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))
