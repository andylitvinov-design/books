# Holistic House · Messenger-first Telegram direct contact

**Status:** implementation prepared; not LIVE until protected merge, additive DB migration,
production READY serving SHA, explicit rollout flag and authorized provider test.

## Owner-approved behavior

A new visitor taps **Write to practitioner** → selects official Holistic House Telegram bot
→ sends `/start hhtalk_en` / `_ru` / `_es` → sees a single short reply-consent
prompt → sends `/agree`. Only that signed, user-initiated event creates or finds
the existing encrypted **owner Telegram CRM** conversation. Later Telegram text
uses the SAME CRM contact/thread. The web Cabinet opens that same thread only
after secure Google account sign-in, verified Telegram bot link and
`crm_google_link_verified_self`, not from a `t.me` click alone.

The existing six-stage `/start hhreview_*` diagnostic questionnaire and
independent marketing opt-in are unchanged. Prior diagnostic consent is **not**
reused to authorize a new direct conversation; a fresh purpose-bound
`/agree` or signed `hhchat:{locale}:agree` callback is required. Old
`hhv1:agree` buttons from questionnaires cannot grant direct permission.
A server-only, inbox-role Boolean SQL guard refuses messages if the master
has suppressed or archived the CRM thread/contact. No health data or private documents
are requested through Telegram. Client /stop suppresses further replies.
Because current CRM suppression can also reflect an owner block, subsequent
/start and /agree **must not automatically clear suppression**; a separate
authorized support review is required for reactivation.

The new direct route is owner-only until other practitioners have verified
independent provider identities. Never present `@holistichouse_bot` as
the personal provider account for every marketplace master.

## Code/release inventory

- Pure helper and copy: `lib/crm/telegram-direct-chat.mjs`
- Signed existing Telegram webhook: `lib/crm/messenger-webhook.js`
- Public first-party readiness: `/api/public/telegram-diagnostic` adds
  `directAvailable` and `directUrls`. The original `urls` are untouched.
- New visitor entry: `components/app/messenger-sign-in.jsx`
- Existing session schema migration:
  `supabase/migrations/20261106172000_hh_crm_telegram_direct_contact_mode_v1.sql`.
  `chat_mode` defaults to `diagnostic`, so old sessions are unaffected.
  `hh_crm_direct_contact_suppressed` is a private Boolean guard callable
  only by the signed-webhook `hh_app_inbox` role, never by browser or service_role.
- Test suites imported through existing CRM and Messages specialist workflows;
  **no new CI pipeline**.
- `HH_CRM_TG_DIRECT_CHAT_ENABLED=true` is the separate **default-OFF**
  rollout flag. It requires the already-approved public diagnostic and connected
  signed Telegram bot; it never enables WhatsApp or newsletters.

## Release/acceptance requirements

1. Real GitHub exact-HEAD Core/Specialist/CRM/IA/browser and protected merge,
   including prior P0 consultation verification PR #3687.
2. Existing Supabase schema migration applied once; check mode default and
   existing FORCE-RLS/private grants. Do not reset consent or owner blocks.
3. Vercel production READY serving merged source SHA (not merely queued).
4. Enable the new flag only for authorized rollout. After change, verify public
   `directAvailable` and exact official `hhtalk_*` links.
5. Real two-account end-to-end: new private Telegram /start → no lead;
   /agree → one CRM thread; text → owner inbox; owner reply → same Telegram;
   Google Cabinet explicit link → same history. Negative: random text, replay,
   wrong chat, STOP, owner-suppressed customer, disabled flag, different
   practitioner, three locales, narrow iPhone.
6. If real provider test is unavailable, state `AWAITING_PROVIDER_E2E`; never
   claim full operational success from a synthetic webhook, 200 or green CI.

No new credentials, paid Meta transport, provider templates, auto-broadcast,
advertising, fake second master, or unapproved customer message.

## Existing Telegram AI companion arbitration

A bot menu/AI mode may coexist with direct practitioner contact. For ordinary
text, the signed update ID of the latest *explicitly selected* conversation
decides the destination; after direct contact starts, an older AI-mode session
cannot silently consume the message. Explicit `/menu`, `/ai` and selected
companion buttons still change modes normally. STOP is global and cannot
auto-unsuppress an owner-blocked contact.

### External handoff limitations

One connected master and no registered WhatsApp Cloud API account are currently
verified. This release must not imply support for a second practitioner's
identity or WhatsApp confirmation. Real user consent/E2E is separate from CI.
