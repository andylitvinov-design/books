# Holistic House Secure Text Conversation History v1 — staged backend

Scope: additive, independent, opt-in transcript storage for the existing
AI Messenger. Not a second bot. No speech file, transcript or personal profile
is stored without signed-in account consent. Does not change AI decisions.

## Endpoints and ownership
- GET /api/app/agent-chat-history retrieves owner-scoped opt-in and a bounded
  encrypted text transcript, with private no-cache response headers.
- POST consent true/false and append, DELETE all. All mutations require
  verified account session, owner-change binding, same-origin and rate guard.
- App-private Supabase tables have FORCE RLS, account_active() checks,
  backend-only privileges, encrypted per-row AAD. Maximum 30 saved pairs.
- No raw audio or free/cloud TTS calls, no new providers, crons or subscriptions.

## Feature activation — NOT SAFE merely because PR merges
1. Protected exact-HEAD CI, privacy/security review and database advisor check.
2. Review/apply supabase/migrations/20261107075500_hh_agent_chat_history_opt_in_v1.sql;
   read back both tables, policies, FORCE RLS and account-role grants.
3. Enable HH_AGENT_CHAT_HISTORY_ENABLED=true only after the backend passes two
   real signed-in account E2E cases, consent revocation/erase and 30-pair limits.
4. NEXT_PUBLIC_HH_AGENT_CHAT_HISTORY_ENABLED=true is reserved for the later
   integration into HolisticAgentChat; ensure that its runtime is actually served
   by the READY production deployment before announcing it to clients.
5. Test account switching, stale tabs, failing database, retry, and no phantom
   success. The client opt-in preference memory feature is separate. Public/guest
   chat stays ephemeral; no identifiable data in browser localStorage.

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial;
post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES.
