# AI Council 2.1 · Video Scout editorial candidate triage

Status: source release candidate. **Not a media/rights approval system.**

## Why

Wikimedia Commons source discovery is live and has research-only records. Even with exact-title noise filtering, source text does not prove images, individual commercial rights, subject releases or source-file compatibility. The owner needs to separate genuinely interesting finds from false positives **before** expensive source checks. No additional paid services, Cron, LLM, external worker or secret is needed.

## Owner flow

Open `/admin/automations` through the existing owner login, inspect an original Commons file page, and select:

- **Review rights / В проверку прав**: only an editorial shortlist. This does NOT clear copyright, creator attribution, commercial derivatives, subjects, original media, MP4 encoding, R2 readback or Video Studio availability.
- **Needs evidence / Нужно уточнить**: metadata or visual suitability must be checked outside the automated discovery loop.
- **Reject / Отклонить**: not relevant for the editorial goal; the source candidate remains available in its immutable research record.

Each decision is stored as an owner-only structured status with an append-only action event. There is no freeform text, arbitrary URL, licence attestation or upload field. Updating a decision adds a new event; repeating the same `requestId` is a no-op. All actions are server-authenticated, same-origin, rate-limited, bounded and use existing Postgres backend role and security boundaries.

## Data and privacy

Apply `sql/ai-council-candidate-editorial-review-v1-20261107.sql` via existing authorized Supabase migration process **before** publishing code. It creates two `app_private` tables with `FORCE RLS`, explicit grants to `hh_app_backend` and no public API permissions. Foreign-key links require a real `research_only` candidate with `unverified` rights. The existing candidate and Video Vault asset tables are unchanged. The count labelled *Awaiting review* excludes previously triaged candidates after migration.

No candidate's editorial state is evidence of rights approval. A future, separate manually controlled Video Vault admission must still follow `lib/video-vault/contracts.mjs`, `scripts/video-vault-ingest.mjs`, explicit owner licence review, local source file, SHA256, media inspection, approved R2 usage and playback acceptance.

## Verification

- Node contract tests for action allowlist/shape, replay, unknown ID, accepted decision, bounded private reads and truthful review counters.
- SQL inspection ensures forced RLS, absence of public grants and absence of Vault writes; Supabase advisors must be checked after migration.
- Existing authenticated owner API (POST `/api/admin/automations/candidates/review`) must be denied to guests, cross-origin, arbitrary JSON, and anonymous requests.
- View on RU, EN, ES and iPhone 390 px; review cards must remain readable, controls 44 px high and not open unsolicited modals.
- After production merge + exact Vercel SHA READY, owner should mark one **actual** candidate and independently verify its state/event in Supabase. Count then decreases; Vault eligible count must remain unchanged.

Rollback: deactivate endpoint code through the reviewed release process if needed; existing triage records are private and inert. Do not delete historical decisions or weaken RLS to roll back.

GLOBAL_PR_ONE_PUBLISH_V1: stage all source/docs/tests; one atomic remote HEAD; protected CI and native checks; no new paid services.
