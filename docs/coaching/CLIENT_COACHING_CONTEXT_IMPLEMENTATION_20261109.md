# Client Coaching Context — implementation notes

## Product behaviour
At the beginning of a new personal coaching session, the server creates a compact candidate summary from the client's own completed-session fields. It does not replay chat history or copy raw answers/transcripts. The summary contains active goals, prior commitments, completed actions, open topics, report references, Life Plan changes, and previous insights.

All automatically derived fields start with `confirmed:false` and `reviewStatus:"needs_review"`. They remain private to the account. A future model adapter must call `confirmedModelContext()`; it receives no data until the client explicitly reviews and confirms it. An unconfirmed hypothesis must never be presented as a client fact or added to a profile.

## Persistence and relations
The existing `app_private.personal_coaching_sessions` account-owned encrypted envelope remains the system of record for personal coaching sessions and their bounded history. Context is stored inside the same authenticated, encrypted envelope to avoid a second source of truth and a new table that duplicates private answers. The existing `app.accounts` identity is authoritative in this application (not a direct `auth.users` foreign key). This respects the current owner-RLS and AES-GCM binding.

The concept diagram's `coaching_life_plans → life_plan_areas → coaching_goals → action_items` and `coaching_sessions → session_events/messages/session_state/hypotheses/reports` is a future normalized reporting/read-model, not a schema that currently exists. This change deliberately does not fabricate report IDs or Life Plan change records. Those arrays stay empty until connected to existing, owner-authorized sources. A separately approved migration is required before adding normalized tables.

## Model contract
- Only the compact allowlisted projection returned by `confirmedModelContext()` may enter a future AI request.
- Never send transcripts, audio, PDFs, clinical notes, test history, third-party names, or unconfirmed context.
- Model output is not a memory write. New facts, insights, and actions require review and explicit client confirmation.
- No LLM provider is called by the current self-guided flow. This is a continuity foundation, not a claim that a live AI coach is already active.

## Release checks
Run `node --test tests/personal-coaching-client-context.test.mjs` and `npm run test:coaching:release`. The new context is backward-compatible with envelopes that do not yet contain a `clientContext` field. Do not turn on any model/provider feature flag or claim production LIVE without the separate approved provider, privacy, migration, CI and mobile acceptance gates.


## Existing Life Plan source integration (2026-11-09 follow-up)

The private development-goals endpoint is the existing owner-authored source for the four Life Plan directional targets. The next-session review now reads it through the authenticated `development-goals` API, and only when the record has a saved revision (revision >= 1) projects the four named sector targets into `life_plan_changes`. Unsaved default 50/100 values are ignored. Numeric test measurements, raw test answers, axis-level diagnostic details and check-in payloads are not included. The client reviews/edits these target labels alongside previous session notes before they are attached to the new encrypted coaching session.


## Completed-session report references (2026-11-09 follow-up)

The continuity summary includes a bounded reference to each completed session's downloadable report (session UUID and date label). It does not duplicate PDF content or answers. The reference remains client-visible/editable and stays in the same encrypted coaching envelope. The future model projection includes only the client-confirmed text and never the internal session UUID.
