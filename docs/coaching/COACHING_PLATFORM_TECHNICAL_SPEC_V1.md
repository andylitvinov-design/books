# Holistic House Coaching Platform — Technical Specification v1

**Связано:** #4018, #4014, #3980  
**Production source baseline:** `codex/public-book-library`  
**Дата:** 2026-11-09  
**Статус:** approved implementation baseline; staged implementation

## 1. Scope and non-scope

### In scope
- общий технологический контур Coaching Platform;
- Session Gateway и lifecycle contract;
- Coaching Brain orchestration boundaries;
- persona/method configuration;
- realtime Voice Gateway provider adapter;
- versioned report contract;
- secure continuity into existing My Coaching Plan;
- safety, QA, analytics minimization and operating limits.

### Out of scope for this foundation PR
- создание нового Supabase project/database/Auth;
- отдельная CRM или task manager;
- новая система кабинетов;
- production schema migration без доказанной необходимости;
- production activation of paid voice provider;
- выдача медицинского/психотерапевтического диагноза;
- автоматические действия, reminders, messages or purchases without opt-in;
- unconditional transcript/audio retention.

## 2. Confirmed inventory and architectural decisions

| Area | Existing object | Decision |
|---|---|---|
| Web | Existing Next.js 15 / React 19 app | Extend existing app |
| Auth | Existing Supabase Auth and verified account APIs | Reuse; never trust client account id |
| DB | Holistic House Supabase project `shervdixkaxurnaecioe`, ca-central-1, PostgreSQL 17 | Reuse only |
| Session envelope | `app_private.personal_coaching_sessions` | Extend encrypted JSON envelope first |
| Encryption | `seal/openSealed`, account/record/field context | Reuse unchanged |
| Optimistic concurrency | `revision` column and locked read/update | Preserve and test conflicts |
| Method catalog | `coaching_models`, `coaching_schemes`, `coaching_steps`, `coaching_questions`, `coaching_answer_sets` | Existing editorial source of truth |
| Existing coaching logic | `lib/app/personal-coaching.js`, `lib/personal-coaching/offline-intelligence.js`, `lib/personal-coaching/guided-session.js` | Preserve as compatibility baseline |
| PDF | `lib/personal-coaching/session-pdf.js` | Add Report v2 renderer input, retain legacy format |
| UI | `components/app/personal-coaching.jsx`, `components/coaching-action-plan.jsx` | Evolve shared experience, avoid duplicate runner |
| Account reports | `app.saved_reports`, `app.saved_sessions` | Audit contract before any use; do not assume these tables are compatible |
| Product issues | #3980 / #4014 | Preserve, link and deliver in sequence |

### Important current limitations
- Existing personal coaching screen explicitly describes itself as self-guided, not a live AI chat.
- Existing recap reproduces user answers and semantic labels; it does not yet constitute a full AI coaching report.
- Existing PDF is browser-side and is based on session answers; a PDF download is not proof of a canonical saved Report v2.
- Existing session row stores an encrypted envelope; it does not provide an unlimited report archive by itself. The `history` bound and payload size must be measured before scaling.
- Current voice UI/dictation components must be distinguished from a full realtime two-way coach audio transport. Do not count device speech-to-text as a live AI coach.

## 3. Repository layout target

Keep the current project naming and use the following as a logical target. Before creating any path, inspect whether an equivalent already exists and extend it.

```text
lib/
  coaching/
    contracts/
      session.js
      event.js
      persona.js
      safety.js
    engine/
      session-controller.js
      context-engine.js
      evidence-ledger.js
      hypothesis-engine.js
      method-selector.js
      next-best-action.js
      outcome-checker.js
      orchestration.js
    personas/
      catalog.js
      resolver.js
    safety/
      gate.js
      escalation.js
    voice/
      contract.js
      provider-registry.js
      session-token.js
      usage-meter.js
    reports/
      report-v2-contract.js
      deterministic-builder.js
      validator.js
      pdf-adapter.js
    observability/
      safe-events.js

lib/app/
  personal-coaching.js          # existing private session persistence
  coaching-session-gateway.js  # new BFF orchestration only if no equivalent exists

app/api/app/
  personal-coaching/             # existing route is in [...path]/route.js
  coaching/voice/session/        # add only after route audit
  coaching/report/               # add only after route audit

components/app/
  personal-coaching.jsx           # existing self-guided room
  coaching-room/                  # new live UI shell; reuse where possible
    coaching-room.jsx
    coach-stage.jsx
    coach-controls.jsx
    coach-transcript.jsx
    coach-avatar.jsx

docs/coaching/
  COACHING_PLATFORM_ARCHITECTURE_V1.md
  COACHING_PLATFORM_TECHNICAL_SPEC_V1.md

tests/
  coaching-report-v2.test.mjs
  coaching-session-gateway.test.mjs
  coaching-voice-gateway.test.mjs
  coaching-persona-contract.test.mjs
  coaching-safety-gate.test.mjs
```

No requirement to build this directory tree mechanically. It is a separation-of-concerns guide, not an order to create duplicate files.

## 4. Domain contracts

### 4.1 Session aggregate

```json
{
  "schemaVersion": "coaching-session.v1",
  "sessionId": "uuid",
  "accountId": "server-derived",
  "schemeKey": "grow_overload_v1",
  "persona": { "personaId": "calm-guide", "version": 1 },
  "locale": "en",
  "status": "active",
  "startedAt": "ISO-8601",
  "completedAt": null,
  "revision": 3,
  "consent": {
    "voice": false,
    "modelProcessing": false,
    "crossSessionContext": false,
    "transcriptRetention": false,
    "policyVersion": "coaching-consent-v1"
  },
  "answers": {},
  "evidence": [],
  "hypotheses": [],
  "reportV2": null
}
```

The accountId is authoritative only when derived from verified server auth; the persisted payload is sealed using the existing account-bound context. Browser-supplied accountId is not used to authorize writes.

### 4.2 State machine
Allowed lifecycle:
- `draft` -> `consented` -> `ready` -> `active`;
- `active` <-> `paused` while the server lease remains valid;
- `active` -> `completing` -> `report_draft`;
- `report_draft` -> `reviewed` -> optional `plan_linked` -> `archived`;
- `active` -> `interrupted` on safety, quota, provider or connection failure.

Terminal semantics:
- complete/end are idempotent; a retry returns the same completed result;
- a closed session cannot accept new answers;
- a report correction creates a new report revision, never silently rewrites its history;
- a client can resume only if server-side session status and lease allow it;
- optimistic revision conflict returns conflict and latest revision without overwriting data.

### 4.3 Session commands
All commands go through existing authenticated BFF conventions and use a strict allow-list.
- `start`: schemeKey, clientQuestion, clientTopic, explicit applicable consent, personaId.
- `answer`: sessionId, revision, questionId, answer.
- `pause/resume`: sessionId, revision.
- `finish`: sessionId, revision, idempotencyKey.
- `report-review`: reportId/version, edited safe fields, client confirmation state.
- `plan-import`: reportId/version, accepted candidate ids, idempotencyKey.
- `end-voice`: voiceLeaseId, end reason.

Unknown keys, oversized bodies and client-controlled owner IDs must be rejected.

## 5. Coaching Brain — execution algorithm

For each user turn:
1. Verify session is active and belongs to current authenticated account.
2. Resolve locale from the actual user message. Existing explicit user-selected language switch is respected; URL locale is only initial default.
3. Run safety gate before ordinary interpretation or tool selection.
4. Load only currently consented context: current session first; previous session plan only after explicit separate consent.
5. Update evidence ledger from direct user input. Preserve source question/message, timestamp and status. Never upgrade hypothesis to fact.
6. Resolve the published persona; validate that the persona may use the requested method and topic.
7. Resolve current method stage and expected outcome.
8. Select one next best action: reflect, clarify, ask one question, invite a pause, provide a small practice, or close.
9. Validate output contract, tone limits, locale, factual grounding and safety.
10. Persist the minimal checkpoint with optimistic revision.
11. Return user-facing text plus safe UI event metadata. Never return hidden reasoning or server keys.

### Method selector score
The selector should not use a single keyword match as final decision. Candidate scoring uses:
- user-stated goal and task fit;
- requested session depth/duration;
- method's reviewed topic tags and limits;
- client's preference/persona fit;
- session state and known missing evidence;
- safety restrictions;
- language completeness;
- availability and cost/latency.

A score ranks permissible candidates only. If confidence is low, ask one clarifying question or offer a short list instead of pretending certainty. User can override the selection.

### Hypothesis discipline
Every hypothesis carries:
- `hypothesisId`, text, source evidence ids, created stage;
- `status: tentative | client_confirmed | rejected | expired`;
- optional client wording/correction;
- no diagnostic label or personality assertion.

Unconfirmed hypotheses must not appear in confirmed decisions, plan imports, marketing/analytics, practitioner handoff or longitudinal metrics.

## 6. Persona contract

Example non-executable configuration:

```json
{
  "personaId": "calm-guide",
  "version": 1,
  "status": "published",
  "title": { "en": "Calm Guide", "ru": "Спокойный проводник", "es": "Guía sereno" },
  "purpose": ["overload", "clarity", "recovery"],
  "tone": { "warmth": 0.9, "directness": 0.35, "pace": "slow" },
  "dialogue": { "questionLimit": 1, "maxWords": 85, "allowSilence": true },
  "methods": ["grow", "solution_focus"],
  "avoid": ["diagnosis", "shame", "pressure", "false certainty"],
  "voice": { "providerVoiceKey": "voice-calm-01", "enabled": false },
  "safetyPolicy": "coaching-safe-v1"
}
```

Ranges are constrained server-side; no persona prompt may override safety, privacy, consent, provider cost, output schema or the user's right to pause/stop. Voice asset keys are public identifiers, not provider secrets.

## 7. Voice Gateway

### 7.1 Provider-neutral server contract

```ts
type VoiceSessionRequest = {
  sessionId: string;
  personaId: string;
  locale: 'en' | 'ru' | 'es';
  transport: 'webrtc';
};

type VoiceSessionGrant = {
  leaseId: string;
  provider: string;
  expiresAt: string;
  clientSecret: string; // short-lived and scoped; never persist in DB/logs
  maxDurationSeconds: number;
  remainingBudgetSeconds: number;
};
```

Grant is returned only after server-side auth, active account, voice consent, feature-flag, quota and cost reservation checks. Persist only the non-secret provider session reference and usage accounting.

### 7.2 Provider adapter
The adapter implements:
- `createEphemeralSession`;
- `closeSession`;
- `readUsage`;
- `normalizeProviderEvent`;
- `mapErrorToSafeCode`.

Avoid making OpenAI Realtime or LiveKit types leak into core session engine. A provider change must affect one adapter, not the session aggregate or UI.

### 7.3 WebRTC and avatar
- WebRTC peer connection is browser-side transport only; it does not authorize the account.
- Token/ephemeral credential comes from the server after preflight; no standard long-lived API key in JS.
- The browser has a visible mic state, mute and stop. OS permission denial is handled without breaking text mode.
- Avatar animation follows normalized UI states (idle/listening/thinking/speaking/paused/error), not raw model internals.
- Audio interruption, user barge-in and reconnect are explicit transitions.
- End button triggers server-side close and a lease watchdog handles disconnect without explicit end.
- Text mode is always available.
- No persistent audio or transcript unless a separate consent scope is added.

### 7.4 Usage and cost guard
- Reserve a server-authoritative time/budget allocation before provider connect.
- Maximum call duration, reconnect count and daily account limit are configuration values.
- On every provider event, usage can update a meter; never use browser elapsed timer as billing truth.
- At hard threshold, close the provider session and show a localized, non-alarming message.
- On provider timeout, fallback to text; don't charge a new session unless new consent/entitlement allows it.
- Usage events contain session id, provider id, elapsed seconds/tokens/cost band and outcome, not user content.

Provider model and actual pricing must be reconfirmed immediately before enabling a feature flag. No paid voice provider is activated in this foundation.

## 8. Report v2 contract

### 8.1 Canonical format
```json
{
  "schemaVersion": "coaching-session-report.v2",
  "reportId": "stable-session-report-id",
  "sessionId": "uuid",
  "revision": 1,
  "status": "draft",
  "locale": "en",
  "createdAt": "2026-11-09T00:00:00Z",
  "session": { "schemeKey": "grow_overload_v1", "personaId": "calm-guide" },
  "outcome": {
    "clientFocus": null,
    "mainDifficulty": null,
    "desiredResult": null,
    "confirmedDecisions": []
  },
  "actionCandidates": [],
  "recommendations": {
    "status": "not_generated",
    "items": []
  },
  "evidence": [],
  "hypotheses": [],
  "review": { "status": "awaiting_client", "confirmedAt": null },
  "planLinks": []
}
```

### 8.2 Evidence item
```json
{
  "evidenceId": "evidence-question-1",
  "kind": "client_answer",
  "questionId": "reality",
  "stage": "reality",
  "value": "Client's saved wording",
  "source": "saved_session_answer",
  "capturedAt": "2026-11-09T00:00:00Z"
}
```

Evidence sources are explicit: `saved_session_answer`, `client_confirmed_edit`, `coach_hypothesis`, `published_method`. Only direct evidence and client-confirmed edits can populate fact-like fields. Coach hypotheses remain visibly tentative.

### 8.3 Action candidate
- `candidateId`, `text`, `sourceEvidenceIds`, `origin: client_selected | coach_suggested`;
- `status: draft | accepted | deferred | declined`;
- `acceptedAt` only after an explicit client action.
- At most three candidates in one report.
- The deterministic fallback can return zero candidates when the user did not specify an action.
- An AI-generated candidate is a suggestion, never a commitment; it must cite supporting evidence and remain unaccepted until user confirmation.

### 8.4 Deterministic fallback
Must always work without an LLM/provider:
- reproduce focus / situation / resources / direction / action / timing from saved answers;
- show missing data as absent, not inferred;
- only call a chosen action "confirmed" when the existing approved plan contains `approvedAt` and valid `actionText`;
- do not generate 3 invented tasks, risk scores, before/after comparisons or claims of progress;
- mark recommendations `not_generated` if no reviewed authored recommendation source exists.

### 8.5 Model enrichment
Allowed only through the existing shared model gateway once available and explicitly enabled:
- request strict structured JSON output matching the report schema;
- provide a narrow set of redacted, consented source excerpts, not entire history by default;
- require evidenceIds for every factual assertion and recommendation;
- reject unknown evidence references and output beyond limits;
- label generated proposals as `coach_suggested`;
- fallback to deterministic output on model timeout/invalid schema;
- no transcript storage by default.

## 9. My Coaching Plan continuity

1. Read current My Coaching Plan data model and UI before making any change.
2. Map each accepted action to one existing life area; if the user has not selected a life area, ask rather than guess.
3. Save using the existing plan API/model; never create a second plan table or task manager.
4. Include a stable idempotency key derived from sessionId, reportId, candidateId and report revision.
5. Preserve original action if already exists; updates require a separate edit confirmation.
6. Keep report link and source provenance in plan item where existing shape supports it. If it does not, open a scoped migration proposal rather than silently changing the schema.
7. Allow user to remove the plan item without erasing the historical report; allow report deletion only through existing privacy deletion semantics.

## 10. Session API and error contract

Use the existing `/api/app/[...path]/route.js` BFF routing pattern and `appFetch` client. Do not assume a new API route is required.

Safe error codes:
- `COACHING_AUTH_REQUIRED`
- `COACHING_CONSENT_REQUIRED`
- `COACHING_SESSION_NOT_FOUND`
- `COACHING_SESSION_CLOSED`
- `COACHING_REVISION_CONFLICT`
- `COACHING_QUOTA_REACHED`
- `COACHING_VOICE_DISABLED`
- `COACHING_VOICE_PROVIDER_UNAVAILABLE`
- `COACHING_REPORT_INVALID`
- `COACHING_PLAN_CONFIRMATION_REQUIRED`
- `COACHING_SAFETY_INTERRUPT`

Responses never echo raw user content in error text. HTTP status: 401 authentication, 403 entitlement/consent, 404 unknown session, 409 lifecycle/revision conflict, 422 contract validation, 429 quota/rate, 503 provider unavailable.

## 11. Privacy, retention, analytics

| Data | Default | Storage / destination |
|---|---|---|
| Current session answers | Persist in signed-in flow | Existing encrypted session envelope |
| Guest answers | Browser memory only | No account persistence without explicit authenticated save |
| Report v2 | Persist after account save / client consent | Existing encrypted envelope initially |
| Full audio | Off | Never stored by default |
| Raw transcript | Off | No analytics, no automatic archive |
| Voice ephemeral token | Short lived | Memory only; never DB/log/URL |
| Usage metrics | Minimal | Existing safe telemetry pattern |
| Prior-session memory | Off by default | Use only after specific consent |

Retention and deletion reuse existing account-level privacy flows. Any new record must be included in export/delete semantics before release.

## 12. Safety requirements

- Safety gate precedes method selection and ordinary next-best-action.
- A signal is a reason to pause and offer appropriate support, not a diagnostic label.
- Do not use productivity framing for a crisis/urgent risk state.
- The assistant does not promise treatment, cure, diagnosis or clinician replacement.
- Sexuality-related flows keep existing age gate and consent behaviour.
- The user can decline a question, pause, change persona, switch to text, or end.
- No coercive language, shame framing or pressure to disclose trauma.
- Do not use cross-session context without dedicated consent.
- A user correction supersedes a model hypothesis immediately.

## 13. Test plan and acceptance

### Unit
- report schema/version and locale fallback;
- evidence grounding and source references;
- unknown fields stripped/rejected;
- zero/one/two/three action candidate handling;
- no inference from timing/resource/direction into commitment;
- session state machine and duplicate end/finish;
- voice provider-off and provider timeout;
- maximum duration hard-stop contract;
- persona policy constraints;
- safety interruption and normal-flow resume policy.

### Integration
- authenticated session save/reload with encrypted storage and revision conflict;
- cross-account read/write denial;
- report draft persistence and revision;
- plan import only after explicit acceptance;
- repeated plan import idempotent;
- report survives provider failure;
- no transcript or answer appears in URL, analytics, server error or safe logs.

### E2E
- guest entry and explicit authenticated continuation;
- signed-in EN/RU/ES;
- finish GROW -> review report -> edit -> confirm -> add action to My Coaching Plan -> reopen report;
- provider-off text fallback;
- realtime audio connect -> interrupt -> mute -> stop -> verify provider close/usage;
- viewport 320/390/430 and physical iPhone Safari.

### Commands
At minimum:
```bash
node --test tests/coaching-report-v2.test.mjs
npm run test:coaching:release
npm run lint
npx tsc --noEmit
npm run build
```

Then existing GitHub protected checks, Preview QA and deployment verification. Do not mark LIVE until exact production SHA and the user journey are independently established.

## 14. Implementation plan

### Sprint 0 — audit and contract (this work)
- [x] identify actual production source branch;
- [x] audit existing Supabase tables and owner policies;
- [x] establish umbrella issue and architecture docs;
- [ ] add deterministic Report v2 contract and tests;
- [ ] verify code on the branch with CI.

### Sprint 1 — Report v2 persistence
- [ ] extend encrypted session envelope with `reportV2` (versioned, size-bounded);
- [ ] add server commands for create/update/report-confirm;
- [ ] render report sections in existing completed session view;
- [ ] maintain report revisions and export PDF from canonical report;
- [ ] connect accepted actions to existing My Coaching Plan idempotently.

### Sprint 2 — Session Gateway
- [ ] map current API routes and consolidate shared preflight;
- [ ] add server-owned session lease and quotas;
- [ ] harden finish/pause/resume idempotency;
- [ ] add cost guard abstraction, provider disabled by default.

### Sprint 3 — Coaching Brain
- [ ] define domain contracts and typed method registry;
- [ ] persona resolver and published persona registry;
- [ ] evidence / hypothesis separation;
- [ ] next-best-action orchestration;
- [ ] safety gate and scenario suite.

### Sprint 4 — Live Voice + Avatar
- [ ] provider/SDK inventory and official docs check;
- [ ] implement short-lived server voice grant endpoint;
- [ ] WebRTC adapter, normalized events and reconnect;
- [ ] avatar state synchronization;
- [ ] metering, hard stop and text fallback;
- [ ] enable only after separate cost approval and real E2E.

### Sprint 5 — longitudinal continuity
- [ ] explicit cross-session memory consent;
- [ ] measurable, comparable self-ratings only;
- [ ] progress timeline and feedback;
- [ ] practitioner handoff only through existing consented tools.

