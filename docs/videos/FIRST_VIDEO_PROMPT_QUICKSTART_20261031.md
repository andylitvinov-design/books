# Holistic House — First Free Video · Prompt-First v1
Date: 2026-10-31

## User journey
At /{locale}/holistic-support/mandala the first screen offers a text wish, optional collapsed creative preferences, an automatically compiled editable prompt, and one free Create Video button. A visitor does not need to complete the existing 49-question editor. All legacy Video Studio controls, free scene collection, video therapy, audio controls, courses and hypno features remain on the same page.

## Local free video — genuine media export
The deterministic first-video director infers visual theme from RU/EN/ES text. It plans 4 real Canvas scenes (6 for 60s) and hands that plan to the ORIGINAL studio state and Canvas/MediaRecorder renderer. Duration, 9:16/16:9/1:1, style, movement, supported music and optional caption are applied to the original player/exporter. The video is downloadable as the browser-supported MP4 or WebM. This is NOT an arbitrary text-to-video diffusion engine: realistic new people, animals and fantasy actions require a separate properly quoted provider. No XP is spent. No paid fallback.

The automatically generated editable prompt describes only available scenes. An edited prompt may affect existing scene matching, but it cannot fabricate a new source or send private data to a paid provider. Personal photos remain subject to explicit existing permission checks, and user audio to the existing rights checkbox. Free first-video text mode intentionally uses background-only output until the visitor explicitly uses the photo panel.

## Optional LLM, disabled by default
On the user's explicit checkbox + click, POST /api/holistic-support/first-video-prompt sends ONLY 800 characters of the typed wish and limited creative enums to OpenRouter free router. Never upload photo, audio, tests, reports or client account. Use same-origin validation, explicit consent, strict JSON schema/size, 30 global calls per day + 3 per minute through existing atomic DB rate buckets, server-side key, timeout and bounded response. Model is exactly openrouter/free, with no paid fallback.

Two explicit server flags are mandatory:
* HH_FIRST_VIDEO_AI_ENABLED=true
* HH_FIRST_VIDEO_OPENROUTER_FREE_CONFIRMED=true
Existing server key HH_COUNCIL_OPENROUTER_API_KEY must be available and confirmed to access a free model. No flags are activated in this PR and no chargeable request was run. If flags, key or quota are missing, the locally generated prompt and media render remain usable. Free-provider availability is not guaranteed.

## Acceptance gates
1. Chromium + WebKit at widths 320/390/430: first wish, optional filters, editable prompt, create button before old editor; EN/RU/ES.
2. Type meaningful wish; verify matched real scene IDs, 4/6 storyboard, format and time range. Edit prompt and preferences and verify they affect actual exported Canvas frames, not just UI text.
3. Generate and download a valid moving video, inspect frames/ffprobe; test silent vs site-owned soundtrack in exported media, not just preview.
4. Try unlicensed audio and private photo: existing explicit permission and no private uploads still enforced.
5. API tests: disabled flags, consent=false, oversize input, cross-origin, quotas, malformed free-router response, XSS attempt, no paid provider.
6. Focused unit + lint + TypeScript + Next build + existing mandala Chromium/WebKit/CI release-ready on exact SHA; verify Vercel READY source SHA and live alias only AFTER controlled merge.

## Release coordination
This is an INDEPENDENT production-target first-video improvement, extracted from the blocked parent #2702 to ship without its unrelated WebKit/hypno E2E blockers. Parent #2702 must rebase/merge with this change later; preserve the new first-video UI, original Canvas, and the parent's 49-question additions. Production = codex/public-book-library, NOT GitHub default codex/bootstrap-books. Source committed does not equal live.

## Actual browser fallback

When the browser lacks Canvas capture (observed in the Linux WebKit acceptance), the first-video button downloads a verified, same-origin first-party MP4 source scene without external processing. The result is visibly tagged **catalog source**, not falsely represented as the multi-shot personalized output. Custom format, requested duration, soundtrack, captions and montage are NOT encoded in this fallback; a user with attached audio/caption/affirmations does not silently receive a different soundless file. Chromium/compatible browsers continue exporting the full custom multi-shot film. Both paths must produce a real ffprobe-decodable video asset, and all original sound and privacy checks still run.

Background-only recording ignores asynchronous frameUrl/photoUrl changes from the separate portrait/mandala editor, so loading a decorative image cannot abort a real active recorder job.
