# My Coach Speech benchmark (issue #5839)

This is a **reference corpus and offline scorer**, not a measured ASR result. 108 authored utterances, 36 in each RU/EN/ES language, including short answers, negations, domain vocabulary, numbers, names and code-switching. No client recordings or private history. Record each utterance with consent or generate synthetic audio, then keep the same clip (SHA-256 as audioId) for every tested model. Use human-recorded fixtures as the primary acceptance dataset; synthetic speech alone is not representative. Keep actual recordings local and private, never commit client audio.

Collect a JSON file per model: {"name":"model-id","results":[{"id":"ru-short-1","audioId":"sha256-of-clip","text":"...","latencyMs":350}]} with every fixture id once. On failure include text:null, not an omitted entry. Run:

`node scripts/coach-speech-benchmark.mjs tests/fixtures/coach-speech-benchmark-v1.json baseline.json candidate.json`

Report WER, CER, coverage, critical exact-text mismatches (not a semantic-error classifier), p50/p95 STT time by language and category. Separately review critical errors manually (negation/name/number/consent), test quiet speech, accent, speaker echo, AirPods and interruption, and measure audio-first coach latency with identical controlled settings. Do not use text-only fixture tests to claim speech accuracy or real latency. Before any paid/free provider experiment check actual entitlement and permissions. No script network requests, credentials, new jobs or paid services.

## Local execution (optional, no hosted provider calls)

Unpack the synthetic test corpus privately to a directory containing fixtures.json and audio/manifest.json. Run:

`python3 scripts/coach-speech-local-benchmark.py /path/to/corpus --check-only`

When a trusted local faster-whisper installation and local CTranslate2 weights are already available, use:

`python3 scripts/coach-speech-local-benchmark.py /path/to/corpus --model-dir /local/large-v3 --name large-v3-local --output /private/large-v3.json`

Repeat with local Turbo weights and a separate output. Use --auto for a separate language autodetection experiment. Run the existing Node scorer on the resulting files. No downloads, credentials, cloud API calls or model-installation requests are made by this runner. It verifies every audio hash and mono PCM16/16k format, uses no reference text as model context, and records failed outputs explicitly. Latencies here are local CPU timings only, not hosted Groq or Gemini latency. Local comparison cannot substitute for real provider entitlement, actual live voice accuracy, human-recorded audio or physical iPhone acceptance. Do not commit private result files or recordings.
