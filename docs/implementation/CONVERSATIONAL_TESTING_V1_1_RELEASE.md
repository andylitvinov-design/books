# Conversational Testing v1.1 — implementation and release evidence

## Scope and source of truth
- Specifications: [v1.1](https://docs.google.com/document/d/1-ZDgbN48AYcilAbZ7EXB4nqcyCXBFe8dUbSaDOL_n8E/edit), [v1.0](https://docs.google.com/document/d/1O8260YUquFYtJYpSo9lB8vCSb8qy3tnkYI9v-Br9USQ/edit).
- Reuse: existing Messenger 2.0 AI pane, `MessengerTestJourney`, `MONITORING_CATALOG`, canonical `ASSESSMENT_DEFINITIONS`, `chatChoosePayload`, guest API, server `scoreAssessment`, report/discussion and `Motivator Mind`.
- The conversation protocol is free and deterministic; no third-party inference or STT is called for assessment responses. Phone keyboard dictation is accepted only as **text**, then requires a separate confirm tap; no app microphone/audio is captured.
- Chat and catalog routes: `/{locale}/app/messages?section=ai&chatTest={rights-cleared-key}`. Only a public instrument key appears in the URL.
- Login and cabinet handoff: existing authenticated guest-result capture at `/{locale}/client?result={result-id}`; it is not an automatic account save until the user completes that flow. Unauthenticated drafts use the existing expiring HttpOnly guest cookie.

## Data integrity
- Preserves canonical wording, timeframes, response anchors, instrument locale, version, content hash, scoring version, and result provenance.
- Original server scoring remains the sole calculator; front-end displays only its stored dimension values.
- Guest saves use existing `expectedRevision` and `operationId`; a 409 refreshes the owned run, an uncertain network result retries the identical idempotent operation.
- Editing the preceding answer sends `null` tombstones for it and all later answers; the original server validator checks the new draft before any resubmission.
- The UI never sends raw assessment answers into the general AI chat history, third-party AI endpoints, tracking or browser persistent storage.
- Rights/age/trauma special cases keep the original gates. Spanish instruments still display their original/source language with an explicit notice, never an invented Spanish translation.

## QA
- `node --test tests/conversational-test-protocol.test.mjs tests/conversational-test-parity.test.mjs`
- Three original scorers: current-state check-in, Mini-IPIP traits, original Socionics typology. Compare canonical batch scoring with the same sequential chat answers.
- Additional checks: RU/EN/ES intents and exact commands, conditional CDC choice, denied guesses, previous-answer invalidation, resume, cancel consent, conflict retry, source-language notice and no leakage to agent history.
- Mobile E2E release gate: run the existing assessment browser workflow on iPhone-sized WebKit, test consent -> 2 answers -> reload -> resume -> back/edit -> finish -> cabinet capture, including voice-dictated text confirmation and offline/back navigation. A real-device Safari acceptance check is **not replaced by parser/unit tests**.

## Release
- Follow `AGENTS.md`, `GLOBAL_PR_ONE_PUBLISH_V1` and `docs/operations/PR_REMOTE_ONE_PUBLISH_V1.md`.
- One authored patch and one initial branch publication; do not merge unless required exact-HEAD Core/Specialist and security checks pass, branch is mergeable, mobile E2E evidence exists and production deployment is READY on the exact merge SHA.
- No new paid services and no Vercel preview deployment: `vercel.json` enables deployment only for `codex/public-book-library`.
- Record actual PR/CI/merge/deployment SHAs in release report, not assumptions.
