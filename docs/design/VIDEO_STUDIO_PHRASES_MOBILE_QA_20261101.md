# Holistic House Video Studio — Phrases mobile QA · 1 November 2026

## Approved reference and page identity
The owner's approved two mobile references depict the existing public Holistic House Video Studio hero and single-page phrase editor. Compare only `/{ru,en,es}/holistic-support/mandala`, guest, **Phrases** workspace, not a signed-in practitioner dashboard. Reuse six existing Studio tabs, one hero player, one renderer, existing music and consent.

## Mobile layout (320, 354, 390, 430 CSS px)
Light cream, muted sage, sand/gold accents. In the same scrolling screen: **Idea → filters → five full-width text phrases → consented voice → background music → preview/Create**. Use horizontally swipeable Idea options, phrase text at least 16px, mobile tap targets at least 44px. Three voice choices each in female/male tabs, one large row per voice; no speculative automatic sample playback. No page-level horizontal overflow.

## Correct functional and privacy contract
Ready/manual/custom phrase selections remain drafts until **Approve**; before approval they cannot alter the visible movie or invalidate its existing narration. Afterwards, spoken words are recomputed from only the exact approved phrases. The six-voice capability check and opt-in speech endpoint already exist: do not create another TTS API or automatically call a paid provider. The standalone music picker must not overwrite an attached mastered narration WAV; a voice/nature mix is configured inside the voice editor. Listen to soundtrack within Phrases without navigating back to Video. No user health details/test results in telemetry or LLM requests.

## Evidence and release gates
Source contract tests plus same-page responsive Chromium/WebKit geometry and click checks. Existing `.github/workflows/holistic-support-mandala.yml` runs real free-video media acceptance and mocked-provider voice E2E for `codex/voice-mix-*` PRs; no provider spend. Capture 320/390/430 anonymous Phrases screenshots as GitHub artifacts. Next lint, TypeScript, build, release-ready, hh-core-verified and hh-specialist on exact SHA. Then validate Vercel READY, SHA and public RU/EN/ES routes.

A mocked waveform or static screenshot is not proof of real provider TTS or physical iPhone Safari recording; report these separately until real provider and on-device evidence exists.
