# Andrey Voice 2.0 — Free Mac-based private report narration

**Status (2026-10-20): FOUNDATION / NOT LIVE.** Tracking: [books #1299](https://github.com/andylitvinov-design/books/issues/1299). Architecture [brain #218](https://github.com/andylitvinov-design/ai-projects-brain/issues/218) and video SOP [brain #219](https://github.com/andylitvinov-design/ai-projects-brain/issues/219).

## 1. Goal and hard constraints

Approved RU/EN client analysis → Mac-based local free cloned voice → private audio in existing Supabase → protected playback in the cabinet. Mac is **not** permanently online. No AI/voice profile download to any client phone. No stock/system TTS substitution. No recurring HeyGen API or cloud-GPU charges. Existing ordinary costs (electricity, storage/bandwidth quota) remain.

**Not a zero-cost 24/7 *generation* guarantee:** when Mac is offline, newly requested audio must wait. Existing completed files can be played at any time once a fully authorized playback pipeline has been implemented and tested.

## 2. Existing verified assets

- English original real voice source in private Drive `Voice Sources`: `Andrey_English_Therapy_v4_Identity_Source.wav` (plus v3). These are preferred over synthetic reference clips.
- Russian voice/complete approved RU videos exist in HeyGen. Obtain a suitable **original** RU recording if available; extraction from a completed synthetic RU video is a temporary quality compromise. No paid re-render.
- Current private report authorization and HeyGen narration surface: `app/api/report-narration/route.js`, `components/report-narration-player.jsx`, `lib/clients/report-narration-{service,model}.js`.
- The production source branch is `codex/public-book-library`; use matching current branch/deployment SHA and inspect repo instructions before changes.
- The owner Mac remains offline in Desktop Commander; no successful MLX installation or RU/EN Mac-audio QA has occurred.

## 3. Queue contract (phase 1 source-only)

The pure metadata model lives in `lib/clients/local-narration-queue.mjs`, covered by `tests/local-narration-queue.test.mjs`.

- *Authoritative input*: browser sends only its existing `scope`, selector/id, locale and part. Reuse **the same** `authorizedAnalysis` checks already protecting the client's HTML/PDF. Never trust `text`, `voiceId`, URLs or file paths supplied by a client.
- *Version*: HMAC-SHA256(key=server-only encryption key, scope + opaque source ID + language + part + SHA256(exact approved text)). No text, name, selector or PHI in job IDs or logs.
- *States*: queued → leased → ready; on failure leased → retry_wait → leased, max 3 attempts, backoff; terminal failed/revoked. Expired leases must be reclaimed atomically with concurrency checks.
- *Lease*: random UUID, max 10 min, **DB atomic claim** using FOR UPDATE SKIP LOCKED or compare-and-swap; exact current lease must be presented on completion. A pure JS transition alone does **not** make claims atomic.
- *Safe client status*: only status/part/locale, no job IDs/hashes/paths/leases.
- *Encryption*: encrypt full text at rest using existing per-app AES-256-GCM with unique nonce, AAD binding the job ID, and a private backend-only RLS table. Never store raw clinical text in a queue.
- *TTL*: pending tasks up to 14 days, ready objects subject to approved retention (initial proposal 90 days), revoke immediately when underlying report access expires or report version changes; scheduled cleanup and storage reconciliation are mandatory before enabling.
- *Cost*: `HH_LOCAL_NARRATION_ENABLED=false` is the hard default; paid `HH_REPORT_NARRATION_ENABLED=false`. Neither source import nor website visits start TTS or produce new charges.

## 4. Proposed *future* HTTP API (DO NOT call until implemented and activated)

| API | Caller | Operation | Required controls |
|---|---|---|---|
| `POST /api/report-narration/local` | authorized report reader | enqueue or report queued/processing/ready/failed | strict same-origin, six-scope auth, fresh approved text/version, rate limiting |
| `POST /api/report-narration/local/worker/claim` | Mac only | atomically claim a sealed task, decrypt approved part for worker only | secret bearer, minimal disclosure, bounded leases, rate caps, audit counters |
| `POST /api/report-narration/local/worker/complete` | Mac only | upload audio, validate lease and signature/size, finalize private asset | fresh lease, audio/mpeg or audio/mp4, <=20MB, private Supabase object, dedup |
| `POST /api/report-narration/local/audio` | authorized report reader | stream audio bytes | revalidate same report/revision/access on every request; Cache-Control no-store; Range/206 on Safari |
| `POST /api/report-narration/local/worker/failed` | Mac only | bounded retry state | secret, no text/error body retention |

**These endpoints do not yet exist.** Do not use the pure contract as proof that real server-side authorization, private storage and idempotency are live.

## 5. Mac worker process

1. Verify Apple Silicon / RAM / free storage; MLX is not appropriate for Intel Mac. Python virtualenv with compatible MLX Audio; install ffmpeg (homebrew or pinned binary) without any paid services.
2. Use clean **private** 5–15-second RU/EN WAV and exact transcripts. Keep samples, model cache and transcriptions outside repository and away from shared folders. Do not expose through Vercel/GitHub/Drive public links.
3. Test synthetic 15–30-second RU/EN text on 0.6B Base then optionally 1.7B Base. Require owner to approve natural timbre, pronunciation, rhythm and absence of clipping before touching any real report.
4. Trusted Mac agent connects outbound HTTPS with rotating secret; it polls only while awake. On claim, writes to isolated local temp files, runs MLX model, converts to MP3/M4A, validates output and sends encrypted TLS upload. Clears work files in finally paths. Avoid raw report text in shell argv, stdout, CrashReporter, syslog.
5. Network failure or Mac sleep leaves the durable leased task to be reclaimed. No duplicate final audio after retries.

## 6. Server-side integration gates

- Add schema/migration with deny-by-default RLS and separate server privileges; no public/anon/authenticated SELECT even when a client receives a report link. Test SQL privileges in production environment before enabling.
- Use existing `hh-client-private-media` bucket, server-side SDK and opaque object IDs; `public=false`, never unlisted YouTube or Drive share playback.
- On upload verify MIME by magic bytes, declared size, max duration and format; prevent trust in client-declared storage keys or returned arbitrary URLs.
- Each private reader: guest-session, cabinet-session, saved-session, legacy-document, cabinet-document, saved-document. Re-check source revision and permissions even after audio is ready; no permission derived from knowing audio URL.
- No mobile model downloads. Client receives only audio and status, with Play/Pause/Resume/Stop/Seek and a legible waiting-for-Mac status.
- If storage/quota is unavailable, fail closed and leave the text readable.

## 7. Acceptance and roll-out

- Contract tests: version changes, wrong scope/language, concurrency, lease expiry and replay, retries, revocation, no PHI in status, 20MB bound and audio MIME.
- Integration tests: unauthorized Mac, revoked link, expired session, edited draft, owner/client roles, no duplicate generation, encrypted DB payload, bounded storage reads; actual Supabase policy readback.
- iPhone Safari and Chromium at 320/390/430px; Range/206, audio start/end, pause/resume/seek and no oversized mobile resources.
- GitHub PR → CI → reviewed merge to `codex/public-book-library` → current Vercel deployment READY + hostname SHA readback. Only then owner QA/activation after consent and credential setup.

**Do not label LIVE until a real private approved report can be listened to on a physical iPhone with Mac on/off behavior verified.** Client-specific medical information must never appear in public videos, models or logs.

## 8. Blockers / owner action

Desktop Commander Remote still reports `air-andrii-3.lan Offline`. The owner needs to open/authorize Remote on the Mac (https://mcp.desktopcommander.app/). Only then can Apple Silicon/MLX setup and sound QA occur. Until then, development proceeds with source-only contracts and synthetic fixtures; nothing is published to real clients. Existing infrastructure's privacy, billing and storage caps still need validation.

**Rollback**: `HH_LOCAL_NARRATION_ENABLED=false`; keep `HH_REPORT_NARRATION_ENABLED=false`; revoke worker secret. No client text or media may be exposed by rollback.

## 9. Offline voice-source QA (implemented, no network)

When an authorized Mac is available, the source WAV may be scanned with:

    python3 scripts/andrey-voice/check_reference.py /private/path/your_voice.wav --strict

The audit reads 16-bit mono PCM WAV **locally** and reports duration, sample rate,
RMS/peak, clipped samples and approximate active seconds. A strict reference must
be 5–15 seconds, mostly audible and unclipped. It does not establish that
pronunciation or the speaker matches Andrey, nor that the local TTS sounds natural;
listening QA remains mandatory. The synthetic unit tests are
`python3 -m unittest discover -s tests -p test_andrey_voice_reference.py`.

No audio, voice models, transcripts or patient data are committed to the repository.
