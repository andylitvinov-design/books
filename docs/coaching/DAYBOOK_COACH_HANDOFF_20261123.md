# Daybook → selected coach

Uses the existing journal/Life Plan and Context Cloud. No second memory, identity, provider, job or schedule.

1. Open a saved journal entry or accepted/active goal in Daybook, choose one existing coach, and select **Open selected coach**. This opens the canonical conversation; it neither shares data nor starts a paid session.
2. Manually open the conversation's existing context review panel. An owner/coach-bound encrypted locator expires after 45 minutes; a revised/deleted source requires reopening the current saved version.
3. For a journal entry, choose the topic and select a nonempty substring of at most 240 UTF-16 characters without splitting an emoji. The short-entry action uses the same validation. Sensitive excerpts rejected by the existing privacy gate cannot be shared here.
4. Choose a provider, review the exact server-resolved text and its current policy notice, then explicitly allow sharing. Journal permissions require the current owner-bound context session and expire with it; no account-wide journal grant exists.
5. The existing selected-context checkbox and later final AI-sharing control remain separate gates. With selected-context access off, the server does not read/decrypt journal text, even when test-result access remains on. Opening, resolving or reviewing a source never invokes an AI provider. Text and Free Live use the existing approved context path and budgets.
6. Revoke an individual permission, or revoke all Daybook excerpt permissions for the chosen provider. Revocation remains available when provider sharing is disabled. The next lookup excludes the text; the existing Live transport retires a socket containing withdrawn context. Already transmitted data cannot be recalled.

Leaving/switching accounts masks the private preview and invalidates outstanding UI requests. No source text or locator is written to local/session storage. Journal data stays encrypted in its canonical store; the existing append-only consent ledger stores source ID, revision, topic/range, session, provider, policy and expiry only. Source updates/erasure invalidate old permissions. Account erasure cascades ledger metadata.

## Provider policy and schema

Preserve the existing HH_COACH_CONTEXT_ENABLED flag and provider-specific approved policy/EN/RU/ES notices. Missing policy disables grants; this milestone does not enable a provider, change billing, create credentials or authorize external calls.

Migration **20261123023514_hh_daybook_coach_excerpt_consent_20261123.sql** was applied once to verified project shervdixkaxurnaecioe. SQL MD5 **95b8ee44a1d32dec8408a49a46f070a8**. Do not replay under a different migration name. It extends the existing category check and requires a concrete item/session/expiry for journal grants. Existing RLS and append-only privileges remain.

## Verification and limits

- 250 scoped unit cases; 9 real PostgreSQL acceptance cases, including two-owner isolation, review proof binding, global/item withdrawal, changed/deleted sources, append-only privileges and session/account erasure.
- Actual React components plus real PostgreSQL: Chromium153 and WebKit27.2; EN/RU/ES at320/390/430; exact selected packet, permission readback, account-switch masking and zero page errors.
- Browser authentication is a synthetic dependency boundary. These receipts do not establish real Google login, external provider receipt, canonical-page visual fidelity, physical-device acceptance or LIVE.
- PostgreSQL acceptance is the seventh isolated target in the existing Daybook CI runner, minimum9 passes. No new workflow/job/schedule.
- Protected exact-HEAD CI/merge, existing hourly deployment and real authenticated LIVE/device checks remain separate gates under #5416.

Independent review-agent startup failed twice with a relationship-persistence error; no independent review approval is claimed. Manual source review found and repaired the pre-decryption opt-in gate, with RED→GREEN negative tests. Protected hosted checks remain mandatory.
