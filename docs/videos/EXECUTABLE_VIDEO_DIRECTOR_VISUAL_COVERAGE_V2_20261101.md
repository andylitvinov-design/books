# Executable Video Director — Visual Coverage & Approved-Cut Lock (v2)
2026-11-01 · Target: production branch codex/public-book-library.

## Problem verified in production code
The v1 executable director chose a single visual hero shot from a thematic preset. The candidate scene pool remained limited to that theme. A visitor's ordered request such as "сначала лес, затем горы, без моря" could therefore render four nature clips without real mountains even though licensed mountain footage was available. AI suggestions were constrained by licensed IDs and duration, but not by preserving the visitor's requested literal subjects.

A second issue was a stale AI response after the user had already confirmed the local director cut, which could alter the displayed storyboard while the underlying Canvas editor still held the prior one.

## Source-backed improvements
- Maintain four actual approved same-origin MP4 source IDs, client exclusions, no URLs or prompts supplied by the model.
- Extract first three positive visual subjects in RU/EN/ES mention order. Match exact visual motifs and content IDs over loose marketing tags. Never treat sky/light as proof of a mountain.
- Keep curated original montage clips, but enrich the bounded list of 16 candidates with verified visual matches from other thematic categories; only scenes that pass isSafeMontageScene may enter the pool.
- Local executable plan: one distinct source-backed shot per available requested subject in order, remaining slots from the curated preset. Exact adaptive 10/15/20/30/60 second film timeline, audio/caption/export controls unchanged.
- Optional consented AI cut: validate JSON at server and browser for unique verified clip IDs, exclusions, exact seconds, requested-subject inclusion AND positive-subject chronology, when suitable real clips exist. Invalid proposal -> local cut fallback. No paid video, false footage claims, new model rights, XP or added service.
- Report visualCoverage.requested/matched/unavailable using only public subject IDs. An unavailable concrete visual causes requiresNovelFootage; in the existing chat it must require transparent symbolic montage consent, not fake depiction.
- Stale-cut lock: an AI request cannot overwrite a confirmed storyboard. Disable approval while AI is working, cancel in-flight provider request at confirmation and on changed intent, reject any answer arriving outside the current review state, validate an immutable execution key covering scene order AND lengths before Create.
- Existing single Canvas/MediaRecorder renderer and music player stay authoritative; no new rendering pipeline or direct production push.

## Verification
- node --test tests/video-executable-director.test.mjs tests/video-chat-intent.test.mjs tests/video-chat-ai.test.mjs
- GitHub current HEAD: Mandala/TypeScript, actionlint, Core, Public Services, protected merge only after mandatory checks.
- Browser/encoded media E2E is a separate release requirement, including Chromium/WebKit and audio sync; physical iPhone Save-to-Files is not implied by CI.
- Watch overlapping open PR #2629 (voice/mixer) and #2938 (mobile layout) before landing: do not discard their source changes. Both may edit the same Video Director Chat or Studio component. This v2 patch deliberately leaves the Studio renderer untouched.
