# My Coach · scoped server method authority foundation (25 Nov 2026)

This narrow, source-only extraction replaces **only the pure foundation** from stale Draft #5233 (which depends on #5221, closed without merge). It does **not** activate a second coaching backend, start/finish voice sessions, create cookies in the browser, persist transcripts, or claim a LIVE feature.

## Included (six files)
- Persona-specific, allowlisted server method codes and lookup, without changing current URL routing or existing app flow.
- Existing server Director and method-protocol functions accept **internally derived** session evidence, with default behavior matching current production when no authoritative state exists.
- session-authority.mjs from reviewed #5233: HttpOnly encrypted server-cookie payload helpers, key derivation and account/auth-session binding, boolean-only milestones, bounded expiry, direct client-turn evidence and no plaintext private goals.
- Focused Node regression coverage for ten registered personas, cross-account rejection, methodology lock, forged history and no transcript in session data.

## Not included / must complete BEFORE public release
- No API route invokes this session authority yet. **Client body fields must never authorize method/evidence**; production normalizeGenerativeCoachInput explicitly rejects unknown fields. Verify this trust boundary.
- Next separate scoped release: authenticated POST /api/app/my-coach/session, strict cookie issuer/reader in existing /turn and /stream paths, method selector with preserved Gemini/Groq consent, 20-min closing, pause/resume and real iPhone voice.
- Require exact-HEAD Node/Next/CI and Safari/WebKit tests, authenticated cross-account & stale session test, stream interruption, no paid provider activation. No migration or new provider.
- Preserve existing #5315 context memory and existing #5475 23 GROW question hints. No revert to old #5221 user interface or private audio exposure.

**Safety: this is DRAFT and NOT LIVE.** See owner progress issue #5473.

## Text and stream integration (draft)
Authenticated same-origin POST/DELETE `/api/app/my-coach/session` provides an explicit allowlisted method handshake; text and Groq stream accept `methodId` only when the verified account/session cookie agrees. Legacy clients are unchanged. No raw messages in cookie, no model or quota change, no additional database. Keep the existing active-foreground timebox; cookie wall clock is for expiry. This is a partial server integration, not yet wired to method choice in the UI or Gemini Live token/checkpoint. Cookie replay by a user controlling their own jar, multi-tab races, revocation, direct Live reconnection and physical iPhone behavior still need explicit validation; do not declare LIVE or enable auto-merge on this draft.
