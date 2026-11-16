# Holistic House — one CRM, one Cabinet, verified messenger handoffs

2026-11-08 · Existing production branch codex/public-book-library · Root: [CRM #985](https://github.com/andylitvinov-design/books/issues/985). No second CRM or session provider.

## Canonical boundaries

1. **Website account**: Supabase Auth, the existing Cabinet/PKCE, Google fallback, and optional official Telegram OIDC (custom:telegram, merged #3511). The first-party GET /api/app/auth/providers gates the additional website Telegram login. POST /api/app/auth/start with provider=telegram reuses the same session/callback/verified account and native external-browser bridge. Bot messages are NOT website login or marketing opt-in.
2. **CRM contact / conversation**: Existing Telegram signed webhook, purpose-bound reply consent, encrypted app.crm_contacts / app.crm_msg_threads / app.crm_msg_items; direct and diagnostic modes are distinct. Only a real consented inbound creates contact; public username/name/phone is never used to merge identities. Explicit Cabinet Telegram↔CRM pairing remains required.
3. **WhatsApp**: The signed one-time identity proof (#3905) can link the already signed-in Cabinet after official Meta WABA verification. Existing private tables and restricted claim/revoke function are installed in Supabase (recorded migration 20261108005752). The WhatsApp CRM transport/intake is still draft #2177. A wa.me click neither creates a verified identity nor logs into the website. Standalone WhatsApp-only sign-in needs a separately reviewed OTP/authentication provider.
4. **Consent separation**: service reply permission, optional message delivery, account link and marketing opt-in must remain separate; STOP, unlink and owner block suppress without auto-repair.

## This integration change

- Guest Messenger Orders/Conversations/News still render the same Telegram bot / WhatsApp conversation invitations.
- Secure website Cabinet entry shows a Telegram website-login button only when first-party server provider status returns telegram:true; status error/unavailable hides it, Google remains.
- Both provider buttons use the existing validated PKCE start and continuation; no extra cookies, fake email, URL-only proof, new database, provider token or automatic customer write.
- The CRM ↔ Cabinet bridge remains an explicit, verified, separately consented action after identity pairing.

## Activation / release gates

- Telegram OIDC env HH_APP_TELEGRAM_OIDC_ENABLED was absent in latest production readback. Set up official BotFather Telegram Login OIDC client, Supabase custom:telegram provider, allowed callback and manual identity linking. Test two real accounts, rejected forged/replay flow, cancel/return, Google fallback, mobile browser. Only then enable the server flag.
- Telegram direct contact code and database field exist, but HH_CRM_TG_DIRECT_CHAT_ENABLED is OFF until consenting actual Telegram /start, /agree, owner CRM reply, STOP, and optionally same thread in paired Cabinet are witnessed. The six-step diagnostic fallback does not grant website access.
- WhatsApp Meta Cloud API credentials/number and owner WhatsApp CRM channel absent; all WhatsApp pilot/public/send flags stay OFF. Resolve #2177 security/QA/Meta prerequisites and test one consenting sender with official signed webhook, CRM dedup and STOP. No marketing broadcasts or paid templates.
- Do not merge held/draft #2177, #2194, #1421 through this patch; they require independent privacy/provider/release acceptance.
- Required exact HEAD Core/App/Specialist/Guard, RU/EN/ES browser/WebKit, protected merge, READY canonical Vercel serving SHA and real two-account E2E are independent gates. Do not report LIVE from merged source alone.

Cost guard: no new service, paid API, worker, bot, workflow, schedule or database. Vercel deploymentEnabled disables non-production branches; existing GitHub public Actions and one immutable PR HEAD.