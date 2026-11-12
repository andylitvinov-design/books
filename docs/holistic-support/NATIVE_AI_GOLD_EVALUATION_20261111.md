# Holistic Native AI — independent gold evaluation v1

**Issue:** https://github.com/andylitvinov-design/books/issues/4367  
**Scope:** NAI-002, original synthetic offline evaluation (not training and not LIVE E2E). Date: 2026-11-11.

## Dataset and independence
Native Secretary #4361 has 15 classes and 364 first-party training examples. The new locked gold set contains **135 independently authored in-domain questions** (3 examples × 15 classes × RU/EN/ES), **48 expected abstentions** (16 per locale: refusal, correction, mixed requests, unrelated tasks, protected actions, sensitive requests, unsupported context fragments), and **12 multi-turn scenarios** (time preference, refusal, correction, price follow-up × 3 languages). All text is fictional; no real client transcripts or third-party AI outputs.

Gold samples have stable version, scenario family, labels and SHA-256. Runner checks duplicate normalized utterances and overlap with original v1 training phrases. These examples must never enter future training. Human reviewers still need to assess semantic near-duplicates.

## Commands
Run on full repo (Node 22+, no external model/network/dependency):
- node --test tests/native-secretary-evaluator.test.mjs
- node scripts/evaluate-native-secretary-gold.mjs
- node scripts/evaluate-native-secretary-gold.mjs --json

CLI imports the first-party classifier and bounded reply module from the current checkout and prints aggregate diagnostics and case IDs. No new CI workflows, model API, secrets, database, paid compute, telemetry or chat storage.

## Definitions
- **Positive recall:** in-domain messages accepted with correct intent; abstaining on valid intent is a miss.
- **Accepted precision:** correctly accepted requests / every accepted prediction, including wrongly accepted negatives.
- **False accept rate:** wrongly accepted negatives / 48 expected abstentions, especially critical refusals/actions.
- **Macro-F1:** equal-weight mean per-intent F1 across all 15 classes, separately RU/EN/ES.
- **Dialogue rate:** narrow lexical last-reply check after a 2–3 turn pure-module dialogue. NOT authenticated state, signed context, actual route behavior, or 12-turn continuity.

## Rollout rules
This suite asserts metric and dataset integrity, NOT that native v1 reaches aspirational 90% quality targets. Do not train or tune on the locked cases. A changed model needs a separate hidden evaluation and blind human review. Record model version/dataset SHA, sample count, languages, failure IDs and performance.

**Independent LIVE checks remain:** authenticated Messenger RU/EN/ES, mobile, refusals/time, no booking/payment without approval, current RLS/consent/safety, serving Vercel SHA, zero third-party AI in Native mode, p95 latency and rollback.

**Ownership boundary:** this QA/data/document-only slice avoids Codex's parallel model artifact/dialogue-state/server route work. One shared Cognitive Core; no second bot.