"""Translate already-public English remedy text offline for editorial review.
No remote translation service, secrets, client data or production writes.
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
assert 0 < len(records) < 1000
names = sorted({r['canonical_latin_name'] for r in records}, key=len, reverse=True)
# Match complete names in any source capitalization, not name substrings.
protected = re.compile(r'(\b(?:' + '|'.join(re.escape(n) for n in names) + r')\b|https?://[^\s)<>]+|message\d+|(?:daomagic|arche_therapy)/\d+|\b\d+(?:[.,:/-]\d+)*(?:[A-Za-z]+)?\b|`[^`]*`)', re.I)
manual = {
 'additional materials and observations': 'Materiales y observaciones adicionales',
 'additional author materials from telegram': 'Materiales adicionales del autor en Telegram',
 'main state': 'Estado principal', 'indications': 'Indicaciones', 'state': 'Estado',
 'basis': 'Base', 'base': 'Base', 'foundation': 'Fundamento',
 'effect': 'Efecto', 'effect of the remedy': 'Efecto del remedio', 'image': 'Imagen', 'images': 'Imágenes',
 'archetype': 'Arquetipo', 'archetypes': 'Arquetipos', 'idea': 'Idea', 'idea of the remedy': 'Idea del remedio',
 'shadow': 'Sombra', 'shadow of the archetype': 'Sombra del arquetipo', 'archetypal shadow': 'Sombra arquetípica',
 'resource': 'Recurso', 'resources': 'Recursos', 'resources of the archetype': 'Recursos del arquetipo',
 'inner conflict': 'Conflicto interior', 'internal conflict': 'Conflicto interior', 'internal conflicts': 'Conflictos interiores',
 'developmental stage': 'Etapa del desarrollo', 'developmental stages': 'Etapas del desarrollo',
 'stages of development': 'Etapas del desarrollo', 'subpersonality': 'Subpersonalidad',
 'meanings': 'Significados', 'lesson': 'Aprendizaje', 'lessons': 'Aprendizajes', 'transformation': 'Transformación',
 'alchemical interpretation': 'Interpretación alquímica', 'alchemy': 'Alquimia',
 'practical observations': 'Observaciones prácticas', 'cases': 'Casos', 'comparisons': 'Comparaciones', 'essence': 'Esencia',
 'scenario': 'Escenario', 'symptoms': 'Síntomas', 'application': 'Aplicación', 'affirmations': 'Afirmaciones',
 'message and lesson': 'Mensaje y aprendizaje', 'ritual': 'Ritual', 'introduction': 'Introducción',
 'case.': 'caso.', 'comparison.': 'comparación.', 'thematic mention.': 'mención temática.',
 'case (with comparisons).': 'caso (con comparaciones).',
 'panic': 'pánico', 'panic.': 'pánico.', 'first': 'Primero', 'second': 'Segundo', 'third': 'Tercero',
}
cache = {}
flags = []
with tempfile.TemporaryDirectory(prefix='spanish-public-copy-') as tmp:
    source_model = snapshot_download(MODEL, revision=REVISION, allow_patterns=['*.json', '*.spm', 'pytorch_model.bin'], local_dir=str(Path(tmp) / 'source'))
    tokenizer = MarianTokenizer.from_pretrained(source_model, local_files_only=True)
    converted = str(Path(tmp) / 'converted')
    ctranslate2.converters.TransformersConverter(source_model).convert(converted, quantization='int8')
    translator = ctranslate2.Translator(converted, device='cpu', compute_type='int8', inter_threads=2, intra_threads=2)

    def phrase(text):
        lead = text[:len(text)-len(text.lstrip())]
        tail = text[len(text.rstrip()):]
        core = text.strip()
        if not core or not re.search('[A-Za-z]{2}', core): return text
        if core.casefold() in manual: return lead + manual[core.casefold()] + tail
        if core not in cache:
            normalized = core.capitalize() if core.isupper() and len(core) < 100 else core
            ids = tokenizer.encode(normalized)
            if len(ids) > 220:
                pieces = re.split(r'(?<=[.!?;])\s+', core)
                if len(pieces) == 1:
                    words = core.split(); size = max(1, min(60, len(words)//2))
                    pieces = [' '.join(words[i:i+size]) for i in range(0, len(words), size)]
                assert len(pieces) > 1
                cache[core] = ' '.join(phrase(p).strip() for p in pieces)
            else:
                result = translator.translate_batch([tokenizer.convert_ids_to_tokens(ids)], beam_size=4, max_decoding_length=512)[0]
                value = tokenizer.decode(tokenizer.convert_tokens_to_ids(result.hypotheses[0]), skip_special_tokens=True).strip()
                assert value and len(result.hypotheses[0]) < 512, 'Empty or truncated translation'
                cache[core] = value
        return lead + cache[core] + tail

    def preserved(source, target):
        cursor = 0
        for token in protected.findall(source):
            found = target.find(token, cursor)
            if found < 0: return False
            cursor = found + len(token)
        return re.findall(r'\d+(?:[.,:/-]\d+)*', source) == re.findall(r'\d+(?:[.,:/-]\d+)*', target)

    def line(value, slug):
        if not value.strip(): return value
        prefix = re.match(r'^(?:#{1,6}\s+|[-*•]\s+|>\s*|\d+\.\s+)', value)
        start = prefix.group() if prefix else ''
        body = value[len(start):]
        if body.casefold() in manual: return start + manual[body.casefold()]
        if protected.fullmatch(body): return value
        # Context-first NMT. Only fall back to segmented translation when exact
        # source identifiers/Latin terms or numeric values would otherwise change.
        translated = phrase(body)
        if not preserved(body, translated):
            parts = protected.split(body)
            translated = ''.join(part if i % 2 else phrase(part) for i, part in enumerate(parts))
        # Fixed reference labels are source annotations, not prose to paraphrase.
        translated = re.sub(r'(message\d+\s*[—-]\s*)asunto\.', r'\1caso.', translated, flags=re.I)
        assert preserved(body, translated), f'Source identifiers/numbers changed: {body!r} -> {translated!r}'
        if len(body) > 45 and len(translated) < len(body) * .58:
            flags.append({'slug': slug, 'source': body, 'translation': translated, 'reason': 'length-review'})
        return start + translated

    entries = {}
    for index, record in enumerate(records):
        slug = record['slug']
        fields = {field: '\n'.join(line(v, slug) for v in record[field].split('\n')) for field in FIELDS if record.get(field)}
        entries[slug] = {'sourceSha256': record['_sourceHash'], 'fields': fields}
        print(f'Translated {index+1}/{len(records)}: {slug}', flush=True)
        result = {'schemaVersion': 1, 'sourceLocale': 'en', 'targetLocale': 'es', 'method': 'offline-opus-mt-en-es-context-first-protected-references', 'model': MODEL, 'modelRevision': REVISION, 'entries': entries}
        OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    report = {'remedies': len(entries), 'sourceFiles': len(records), 'translatedFields': sum(len(x['fields']) for x in entries.values()), 'translatedCharacters': sum(len(v) for x in entries.values() for v in x['fields'].values()), 'modelRevision': REVISION, 'protectedValues': 'verified per line', 'editorialReview': 'required before merge', 'externalTranslationApi': False, 'reviewFlags': flags}
    (ROOT / 'spanish-translation-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False, indent=2))
