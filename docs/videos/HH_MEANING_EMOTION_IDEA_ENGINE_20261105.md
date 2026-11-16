# HH Meaning × Emotion Idea Engine v1 — implementation notes

Source of truth: [owner's v1.1 specification](https://docs.google.com/document/d/1_3uyosNgACToce53vhy2yQ48vPToRTIlegvc5FTM2T4/edit).

## Deployment and safety

- Production base: `codex/public-book-library`.
- Two **separate opt-in** public build-time flags are required:
  `NEXT_PUBLIC_HH_STSE_ENABLED=true` and
  `NEXT_PUBLIC_HH_MEANING_IDEA_ENABLED=true`.
  Both default off. Do not turn them on until owner editorial review and
  licensed-media QA are complete. Do not add scheduled CI, paid APIs, new
  media sources or new billing services.
- Local, deterministic, multilingual RU/EN/ES support. No personal input to an
  LLM/provider; no automatic personalized sales recommendation; no clinical
  inference or claimed therapeutic effect.
- All 8 top-level meaning axes preserved: anchor, connection, freedom,
  agency, dignity, wholeness, meaning, growth. Exactly 11 sub-axes remain
  linked to them (1/1/1/1/2/1/3/1).
- The v1 *editorially authored starter subset* consists of 8 canonical
  directed STSE emotional pairs, 64 compatible axis/vector cells and 192
  unique ideas (each written in three languages). This does **not** imply
  that every possible pair of the 48 STSE states has been editorially curated.
  Unknown pairs fail closed; they are not filled with generic affirmations.
- Explicit forbidden *frames* are stored for seven psychologically
  incompatible interpretations, e.g. forced closeness, forced forgiveness,
  self-blame or overactivation at low energy. These are not silently
  treated as forbidden entire axes: a noncoercive alternative idea can
  remain safe for the same axis/vector cell.
- `source_curated` means newly authored proposal content with an offline
  structural/safety audit. It does **not** mean a human clinician, owner or
  editorial board approved the ideas. `approvedByOwner=false` for all
  192 ideas until an independent editorial approval workflow marks them
  approved. Do not report these 192 as owner-approved.
- Optional `current.intensity` and `energy` retain `null` when absent,
  including on refresh. High intensity/low energy force gentle pacing even if
  a user preference asks for vigorous delivery.
- The user chooses a meaning axis, a candidate idea, a rewritten idea or
  the valid neutral path; nothing becomes selected before confirmation.
  Canonical tab-local choices survive refresh using sessionStorage. No
  raw free-text is sent to analytics, CRM, an external model, or a server.
  SessionStorage may be unavailable; in-memory operation still works.
- The nonclinical `reviewCreativeMeaningIdea` function is a safe,
  *creative-only* adapter in Psychologist Mind. Its existing protected
  program/session paths remain unchanged; browser data cannot forge
  `safety.status="clear"` or account access to obtain clinical methods.
- After confirmation: the narrative bridge ranks an existing STSE-safe
  film-template/motif pair, aligns its editorial emotional transition
  with the creative Psychologist Mind process, then returns a four-beat
  **scene plan with unverified video bindings**. It never asserts that
  literal actions or a motif are visible in an actual video.
- The original MyTube eight-scenario taxonomy, motif/style catalog and
  local four-MP4 Auto Video Director are reused. One explicitly confirmed,
  caption-length-compliant idea may be added as the last caption **only
  if that caption is empty**; it never overwrites manual text, uploaded
  media, chosen music or voice. An overlong proposed caption visibly blocks
  new film confirmation until shortened or disabled. Existing rights,
  source-count and iOS export checks remain authoritative.

## Verified coverage versus delivery status

The data module audit must report:
- 8 axes; 11 facets; 8 curated emotional vectors.
- 64 / 64 compatible curated cells; 192 unique author-created ideas.
- 3 locales for all 192 ideas; 7 disallowed semantic frames.
- 0 independently owner/editor-approved ideas at initial publication;
  192 proposed / source curated. Owner/editor review is an explicit
  remaining release gate, not a passed test.
- Local source checks, new node tests, exact-HEAD CI, protected merge,
  production deployment and real playback/export verification must be
  reported independently with their actual evidence. Do not treat a
  GitHub merge or a Vercel READY response alone as end-to-end media proof.

## Regression criteria

1. `node --test tests/meaning-emotion-idea-engine.test.mjs`:
   complete 64-cell and 3-locale audit, 192 acceptance requests at
   varying intensity/energy, safety and negative cases, deterministic
   ranking, confirmation, edit/neutral, nonclinical integration, film
   handoff and no-rights-bypass assertions.
2. `node --test tests/state-transition-scenarios.test.mjs
   tests/psychologist-mind.test.mjs
   tests/mandala-auto-video-director-ui.test.mjs`: old behavior remains.
3. Typecheck/build and current CORE/Specialist/Guard exact-HEAD checks
   run under the repository's existing protected PR contract.
4. With both flags off, the existing Auto Video Director and STSE
   behavior are unchanged. With both flags on, verify 320/375/390/430
   mobile widths, RU/EN/ES, a confirmed idea reflected in a user-approved
   film caption, optional neutral path, no overlay displacing the pinned
   mobile navbar, no regression to user-supplied music/voice/manual clips.
5. LIVE requires independent Vercel READY on the merge SHA *and* actual
   production functional evidence for successful original MP4 output.

## PR policy

Follow [GLOBAL_PR_ONE_PUBLISH_V1](https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md):
stage all blobs, tests and docs before a **single** remote branch ref
publication; freeze HEAD during CI; no repeat workflow dispatch, paid
preview fan-out or security bypass. Record exact first HEAD, PR, actual
checks, merge SHA and LIVE separately.
