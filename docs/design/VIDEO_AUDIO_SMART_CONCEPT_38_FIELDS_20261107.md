# Smart Concept Director · Audio → 38-field Concept · 2026-11-07

**Status:** implementation candidate (not production). **Upstream dependency:** [Auto Concept PR #3852](https://github.com/andylitvinov-design/books/pull/3852), target **protected** \`codex/public-book-library\`. Scope: transcript-derived editorial concept, not paid video generation. No new external provider or database migration.

## Existing production assets kept intact

- Protected, same-origin opt-in STT: \`app/api/holistic-support/audio-storyboard/route.js\`; bounded input (4 MB), free-tier flag, global quotas, no audio/text storage. \`consented-audio-stt.ts\` is the browser-only STT transport.
- Time-aligned, safe/licensed scene matching: \`audio-visual-storyboard.mjs\`; checks source provenance, rights, aspect ratio, distinct original masters and duration before exposing available clips.
- Canonical MyTube topic registry: **4 categories × 4 subcategories × 4 topics = 64 topics**, 4 editorial scenarios per topic, 8 meaning axes, 4 allowed motifs per axis, 10 visual styles, 4 editorial beat roles. Editorial concepts are **not** evidence of available MP4.
- Existing one-player Video Studio: \`components/mandala-free-video-studio.tsx\`; Concept in Montage, not a new wizard. Guest can approve and continue; edit remains behind existing sign-in flow.
- Master requirements: [Video Studio ТЗ §28.2 and §28.13](https://docs.google.com/document/d/1890GgLvnVy0SC1eTdhLjQc2fU1G6izhwavM34wGJkKk/edit).

## Pipeline

1. Only after explicit user consent, existing production endpoint transcribes the uploaded recording, returning text and timestamped segments. Failed recognition never triggers fabricated segments.
2. Local \`suggestVideoConcept\` uses the **transcript as the primary semantic source** over stale Goal/Ideas text; existing Goal/Ideas are still context. The proposal signature includes a bounded transcript fingerprint so a new recording invalidates an older approval.
3. \`enrichVideoConcept\` identifies purpose (personal support, celebration/gift, presentation, meditation/practice, audio-based content), audience when explicit, canonical category/subcategory/topic, meaning axis, allowed motif, artistic style, scenario, four narrative beats, main message, tone, pacing and negative imagery, with RU/EN/ES synonym support.
4. For time-aligned audio, divide *actual timestamped speech* into four conceptual beats; do not hallucinate dialogue in silence or promise unseen footage. For text-only input, use canonical editorial story beats.
5. Build the **38-key \`parameters\` record** with \`value\`, \`status\` (extracted/suggested/manual/synchronized/unknown) and \`source\`. Unspecified private facts stay unknown.
6. C33–C38 (materials, settings, words/voice, soundtrack, montage, creation mode) are *owned by existing editor widgets*. Concept displays current live values via \`ownerFields\`, not its own duplicated provider controls. No auto-uploads, payments or hidden account creation.
7. Scene matching receives the canonical concept only to **refine ranking of already verified footage**, while actual spoken visual matches retain dominant score. Honor explicit "without sea/forest/dark/mountain/flashing" directives; if insufficient approved footage, show \`INSUFFICIENT_APPROVED_VIDEO\` or other genuine blocker, not "video ready".
8. Consent and rights stay separate; normal approval does not overwrite manually customized text/video/audio/voice/timeline. One original renderer, existing exports and output gates remain authoritative.

## Field mapping (canonical C01–C38)

| Group | Fields | Source of truth |
| --- | --- | --- |
| A: Objective | C01 intent; C02 purpose; C03 audience; C04 categoryId; C05 subcategoryId; C06 topicId; C07 situation; C08 currentState; C09 desiredState | Audio semantic recognition + existing Goal |
| B: Story | C10 meaningAxisId; C11 mainMessage; C12 motifId; C13 scenarioId; C14 plotMode; C15 archetype; C16 beats; C17 hook; C18 centralAction; C19 endingIntent | Validated editorial taxonomy + actual speech |
| C: Emotion | C20 transitionPath; C21 startingTone; C22 endingTone; C23 intensity; C24 pace; C25 emotionalProgram; C26 method; C27 voiceTone | Safe editor suggestions, no therapeutic guarantee |
| D: Visual | C28 styleId; C29 visualWorld; C30 characterAndPOV; C31 visualActions; C32 avoidImagery; C33 references | Visual constraints + actual attached assets |
| E: Production | C34 delivery; C35 wordsAndVoice; C36 soundtrack; C37 timelineBinding; C38 creationMode | Existing Settings, Ideas/Voice, Audio, Montage, Render Policy |

No invented canonical IDs. Example editorial briefs remain labeled as such; programmatic confidence is not a clinical diagnosis or validated media coverage. If a requested symbol is not permitted by the selected axis, choose a legal alternative for review.

## UX

In Montage → **Concept**, display a prefilled readable summary (Goal, Purpose, Audience, Category, Subcategory, Topic, Style, Meaning, Symbol, Scenario, Emotional Program). A collapsed "All 38 parameters" sheet shows provenance and live owner settings. When audio has been transcribed, explain that fields were proposed from speech, provide four beat texts, and allow transcript review separately in Audio. Main action "Approve and continue" remains guest-free; "Edit Concept" keeps existing sign-in gate. Imported messenger audio enters Concept rather than silently skipping to Settings.

## Privacy, cost, reliability

- No transcript content is sent to any **second** model/provider in this revision. Rules execute locally; no additional recurring fees, secrets, free-quota bypass, storage, logging or analytics for raw speech.
- The user-facing wording must not imply GPT itself runs in production. **Follow-on improvement** (separate opt-in) may use an *already free-confirmed* text-model endpoint to produce structured semantic suggestions. Requires **specific consent for second-provider transcript transfer**, strict JSON schema/ID allowlists, source-field provenance, rate limits, prompt-injection defenses, error fallback to local proposal, and provider-free flags. Never enable automatically or infer unlimited free model access.
- Plan source IDs, rightsholder provenance, aspect, consent, duration, distinct masters, actual final playback and export gates remain unchanged.
- Risk: shorthand/ambiguous ASR speech may produce conservative suggestions. Allow edits and preserve negative visual constraints.

## Acceptance and QA gates

1. Focused Node tests: exact 38 keys, RU greeting EN presentation ES meditation, transcript changes update signature, timeline beats and explicit exclusions, independent settings ownership, manual cascades and rights-protected media blocker.
2. Original \`tests/mandala-video-concept.test.mjs\` and audio-visual storyboard tests remain green; TypeScript, lint, Next production build must pass on **exact final head**.
3. WebKit/Chromium guest iPhone widths **320/354/390/430** and EN/RU/ES; real user audio upload → explicit STT consent → timed transcript → Concept 38 fields → review → audio → actual licensed MP4 verification/export. Regression: no audio loss, no incorrect language, no overwriting manual media edits, no accidental cloud AI request.
4. Protect parent PR #3852 and any competing studio PR leases. Stack a separate single-writer feature PR, one coherent atomic source publication, no bypass of CI protections.
5. **LIVE** only after upstream #3852 and this change merge into the protected production branch, exact deployed commit/descendant Vercel READY alias \`holistichouse.vercel.app\` plus real end-to-end production smoke. A PR and passing source tests are **not** a LIVE deployment.

## Files

- \`lib/mandala/video-concept-semantic.mjs\` — all 38 field proposals.
- \`lib/mandala/auto-video-concept.mjs\` — canonical proposal integration, signatures and manual cascades.
- \`components/mandala-video-concept.tsx\` — native existing UX and 38-field detail view.
- \`components/mandala-free-video-studio.tsx\` — one original Audio-to-Concept handoff, live owner fields.
- \`lib/mandala/audio-visual-storyboard.mjs\` — concept-aware, licensed-footage rank refinement.
- \`tests/mandala-audio-smart-concept.test.mjs\` — behavior and privacy regression checks.
