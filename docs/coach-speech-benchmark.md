# My Coach Speech benchmark (issue #5839)

This is a **reference corpus and offline scorer**, not a measured ASR result. 108 authored utterances, 36 in each RU/EN/ES language, including short answers, negations, domain vocabulary, numbers, names and code-switching. No client recordings or private history. Record each utterance with consent or generate synthetic audio, then keep the same clip (SHA-256 as audioId) for every tested model. Use human-recorded fixtures as the primary acceptance dataset; synthetic speech alone is not representative. Keep actual recordings local and private, never commit client audio.

Collect a JSON file per model: {"name":"model-id","results":[{"id":"ru-short-1","audioId":"sha256-of-clip","text":"...","latencyMs":350}]} with every fixture id once. On failure include text:null, not an omitted entry. Run:

`node scripts/coach-speech-benchmark.mjs tests/fixtures/coach-speech-benchmark-v1.json baseline.json candidate.json`

Report WER, CER, coverage, critical exact-text mismatches (not a semantic-error classifier), p50/p95 STT time by language and category. Separately review critical errors manually (negation/name/number/consent), test quiet speech, accent, speaker echo, AirPods and interruption, and measure audio-first coach latency with identical controlled settings. Do not use text-only fixture tests to claim speech accuracy or real latency. Before any paid/free provider experiment check actual entitlement and permissions. No script network requests, credentials, new jobs or paid services.
