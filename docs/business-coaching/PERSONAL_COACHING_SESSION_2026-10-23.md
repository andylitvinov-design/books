# Personal Coaching Session · Holistic House · 2026-10-23

## Decision
The 90-day **Business & Career** course is **paused for discovery and promotional entrypoints**, not deleted. Existing account-owned 90-day saved answers remain intact in `app_private.business_coaching_programs` and the legacy `/{en|ru}/app/business` route still renders them for owners. New visitors enter an **independent** course named **Personal Coaching Session / Личная коуч-сессия**.

## User experience
- Accessible from My Courses, My Development Path, Academy and Business topic cards. Desktop and mobile share one focused idea per screen (320–430px). EN/RU; ES public card explicitly links to EN private player until Spanish cabinet auth is available.
- Seven short, optional private questions, informed by Goal → Reality → Options → Will: focus; useful session outcome; current circumstances; main obstacle; one possible choice; one specific smallest action; realistic timing.
- Exactly one question per slide, quick suggestion chips + editable text directly below, explicit Save & Continue; Back, voluntary Skip on non-required questions, exit confirmation for unsaved drafts. No calendar commitment, 90-day checklists, scoring, invented assessments, mandatory courses or auto-bookings.
- Results screen summarizes **the participant's own words**, not invented coach advice. Start another session without overwriting prior eight saved session transcripts. This is **self-guided**; no live human coach or AI conversation is implied.
- No automatic reminders, emails, third-party analytics payloads, messaging, CRM forwards, health diagnoses, paid APIs or videos.

## Security/data
- POST/GET `/api/app/personal-coaching` requires server-verified Google Supabase session, currently active account, exact `X-HH-Account-ID`, same-origin writes, revision match.
- Database `app_private.personal_coaching_sessions`: account primary key, AES-256-GCM encrypted payload bound to per-owner encryption AAD `personal.coaching`; history capped at eight, with owner-scoped RLS, direct anon/auth access revoked. Different table from legacy 90-day programme.
- Only allowlisted seven question IDs; 800-char max per answer, optional deliberate skips stored as null; separate actions `start`, `answer`, `complete`, confirmed `delete`. Private export includes owner transcript.
- Real signed-in save/reload, a second-account RLS attempt, mobile Safari visual QA remain **manual acceptance gates** until run.

## Acceptance
1. Catalogs promote Personal Coaching Session, not the 90-day programme; old 90-day direct link still works for existing participants.
2. One question + its editable answer per screen, convenient mobile CTA, no results leaked to URLs.
3. Server returns a durable encrypted save and revises only the owning account. Reload resumes from first unanswered question. Missing/optional responses stay missing (not 0%).
4. Final summary uses saved client answers; repeated session archives prior summary. No phantom booking/lead/paid transaction.
5. Existing old 90-day DB untouched, RLS/gating unchanged. Verify exact production READY SHA and alias separately from PR merge.
