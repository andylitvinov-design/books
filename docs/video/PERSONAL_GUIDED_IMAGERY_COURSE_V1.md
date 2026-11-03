# Holistic House · Personal Guided Imagery Video Course v1

**Issue:** #2503 · **stacked on:** PR #2502 · **target:** `codex/public-book-library` after review and CI. Public product: `/{en|ru|es}/holistic-support/mandala`.

## User-facing contract

This is an **optional** mode inside the existing warm cream/emerald personal video editor, not a second site route.

- Buttons: **Suggest from my test profile** and **Set accents/goals**; the latter opens a small 6-topic filter, up to three priorities.
- The private profile is loaded only after an explicit unchecked-by-default consent and a second **Use saved scores** button. Uses the existing first-party authenticated `GET /api/app/bootstrap?view=portrait` (private, no-store), validated by the existing `buildPsychPortrait` and its source/version/freshness checks. Does **not** upload questionnaires to external AI, CRM, social pixels or YouTube. A revoked consent invalidates an in-flight request; data is ephemeral in the component.
- User-selected goals **always take precedence**. 1–10 self-ratings are explicitly touched inputs, not substitutes for verified psychometrics or defaults pretending to be real user scores. Different instruments are never averaged or ranked as universal levels of “health”, “personality” or “deficit”.
- Versioned **8 × 60-second video storyboards** with authored EN/RU/ES original, gentle resource-imagery scripts. The eight motifs are: meadow, garden, stream, tree, house/boundaries, hill/path, bridge/choice, horizon/integration. Goal labels adapt, with explicit consent and script review. The engine is an inspectable, deterministic **planning assistant**, **not an AI psychotherapist** and not an automated medical intervention.
- **Free session 1:** Client explicitly applies the scene and affirmative phrases to the existing Canvas/MediaRecorder editor, then independently taps the existing `Create video` button. Actual MP4/WebM availability depends on browser/codec. The original built-in export/download and local-only privacy stay intact. A UTF-8 text file with session 1 script is downloadable. Optional `speechSynthesis` reads the script aloud on the device; it is **not** a mastered/downloadable narrated audio file. Do not call this an 8-video render or downloadable narration.
- **Sessions 2–8:** Show titles/motifs and locked previews without fabricated entitlement. Full offer asks user to **discuss** a package with a professional on the *existing* imagery-therapy service page. This is **not** a checkout, purchase confirmation, or paid unlock.

## Gaps for a legitimate 8-video + 8-audio therapeutic package

The follow-on implementation must reuse current My Courses / My Progress and owner-scoped encrypted account/cabinets. Clinical/therapeutic plans require a qualified practitioner's documented review and an individual choice to accept/skip or stop at any point. A supervising therapist should decide indications, suitability, red flags and whether imagery-based work is appropriate, especially trauma, dissociation, psychosis, acute crises or distress. The editorial planner has no access to a clinical interview and cannot replace one.

Before claiming full package E2E:
1. Design a practitioner-reviewed versioned plan payload with test-result provenance stored privately using server-side authentication, per-owner access, DB/RLS and explicit, revocable purpose-specific consent. Avoid saving scores, unredacted script or patient text in CRM marketing tags, analytics or messenger notifications.
2. Map each session to a real approved video scene or privately rendered video, voice and master asset. Deliver **8 actual recorded audio files and 8 actual video files**, real-download verified on physical iPhone; distinguish local browser speech preview from mastered audio. Avoid YouTube for clinical private patient media.
3. Implement approved price, eligible payment provider (business status NOT assumed), confirmed paid entitlement (provider webhook/readback), refund/revoke and practitioner sign-off. Never charge, automatically generate paid media, or publish without owner authorization.
4. Verify server auth and consent revoke, foreign-account 403, stale/invalid instruments, no marketing tracking, rate limiting, 320–430px iPhone/Android/Safari, EN/RU/ES, offline/codec failures. CI, preview, production deployment **READY SHA + alias**, then actual E2E.

## Non-clinical boundaries

“Therapeutic” describes **supportive guided imagery and reflection** only in this self-service iteration. No automatic diagnosis, guaranteed symptom reduction, trauma exposure, subliminal influence claims or prescription. An authentic supervised therapy course requires clinician oversight and consent. Entire personal profile stays on the first-party screen; do not send health data to external AI or media providers by default.

## Evidence of implementation (not production proof)

- `lib/mandala/personal-guided-course.mjs`
- `components/mandala-guided-course.tsx`
- `components/mandala-guided-course.module.css`
- `components/mandala-free-video-studio.tsx` (existing editor, no duplicate)
- `tests/personal-guided-course.test.mjs`

No schema migration, paid renderer, message send or checkout was initiated.
