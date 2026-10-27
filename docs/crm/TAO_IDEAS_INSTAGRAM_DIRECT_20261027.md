# @tao.ideas → Holistic House CRM Messages — Instagram Direct connector

**27 October 2026 · Implementation status:** code prepared / awaiting exact-head checks and real Meta OAuth. **Do not call this LIVE until Meta's real signed webhook has saved a DM to the owner's existing CRM and an owner-authenticated readback has succeeded.**

Canonical open issues: [#2257 DAO Wisdom launch](https://github.com/andylitvinov-design/books/issues/2257), [#2255 original editorial strategy](https://github.com/andylitvinov-design/books/issues/2255), [#985 CRM Messages](https://github.com/andylitvinov-design/books/issues/985). The Instagram account already exists: **[@tao.ideas](https://www.instagram.com/tao.ideas/)**. Do **not** create another account, bot, client database or duplicated lead.

## Desired flow

```
Instagram @tao.ideas professional Direct Messages and story replies (after Meta activation)
 -> Meta signed webhook for the instagram object / messages
 -> https://holistichouse.vercel.app/api/app/crm/messenger/webhook/instagram
 -> existing CRM signed verification + exact professional account ID gate
 -> app_private.crm_msg_resolve + crm_msg_ingest
 -> one encrypted owner-only CRM contact/thread per Instagram sender
 -> https://holistichouse.vercel.app/ru/app/messages (Instagram @tao.ideas filter)
 -> owner-approved manual reply through the 23-hour Meta service-window gate.
```

This is an **inbox**, not autonomous AI diagnosis, a Telegram relay of private DMs, or a marketing consent mechanism. Clicking a Reel, writing a comment or sending a DM is not a confirmed booking or payment. The Instagram channel never silently creates a duplicate Telegram lead or merges people by display name. Telegram's original six-message V2 flow remains unchanged.

## What the existing adapter now does

- Reuses one encrypted CRM Contacts/Messages store and owner-only RLS; account identity, customer IDs, provider IDs and text are protected by the existing hashing/sealing scheme.
- Accepts `object='instagram'` with `entry[*].messaging[*].message` events signed by the configured Meta app, **only for the exact Instagram business ID** and only when the recipient matches; ignores echo/outbound events and unrelated Meta pages/brands.
- Saves text and story replies into the correct existing CRM thread; for images/audio/video/shared content, stores a type-only marker, **not media binary or raw Meta CDN URLs**. Media-player/proxy and lossless historical sync remain separate, unverified future work. STOP from Instagram suppresses further replies through existing policy; replays dedupe by provider message/event identifiers.
- The owner sees a distinct “Instagram · @tao.ideas” source in existing CRM Messages and a separate contact label when the sender's name is not supplied by the provider. No automatic mass sending, advertising, pixel, tracking, consent-based mailing or billing.
- Adds production-only `HH_CRM_MSG_INSTAGRAM_INBOX_APPROVED=true` separate from global `HH_CRM_MSG_PRODUCTION_APPROVED`. Activating Instagram cannot enable WhatsApp/Messenger/Telegram broadcasts.
- The owner **Connect** action performs **read-only** official Meta checks: `GET https://graph.instagram.com/{version}/me?fields=id,username,account_type`, confirms **id + tao.ideas + Business/Creator**, `GET /me/subscribed_apps` confirms `messages`. A Meta app URL, token alone or platform scheduler is NOT evidence of actual connected inbox.
- Any operator reply still requires verified existing conversation, no STOP, explicit owner click, the conservative 23-hour window, one recipient, provider receipt or “unknown”. Does not copy private user text into Telegram bot notifications.

## Currently verified blocker (2026-10-27)

- Owner confirms the Instagram profile **@tao.ideas exists**. No verifiable Instagram OAuth login/account-type readback has been completed here.
- Read-only Vercel Production metadata for `super10/codex-public-book-library` shows **NO** `HH_CRM_MSG_INSTAGRAM_*` and NO Meta messaging credential names. Do not request decrypted secret values.
- Metricool's sole listed brand is connected to a YouTube channel only; that integration does **not** supply access to Instagram Direct or to the website.
- Supabase `holistichouse` `app.crm_msg_accounts`: one registered/enabled Telegram channel; **no** Instagram registered channel at readback. Provider live webhook/real customer DM/owner reply E2E unverified.

## Owner Meta setup — only actions not automatable without account sign-in

1. Open [@tao.ideas](https://www.instagram.com/tao.ideas/) and ensure account type **Creator** or **Business** (Professional). In Instagram Settings → Messages and story replies → Message controls → Connected Tools, enable **Allow access to messages** (exact wording may vary). A Personal account does not provide this API. The product does not require a separate Facebook Page when the selected login flow is **Instagram API with Instagram Login**.
2. In [Meta Developers](https://developers.facebook.com/apps/) use the **Instagram API with Instagram Login** for this account; approve `instagram_business_basic` and `instagram_business_manage_messages`, with a valid professional account token. App Webhooks callback should point to `https://holistichouse.vercel.app/api/app/crm/messenger/webhook/instagram`; subscribe to the `instagram` object, `messages` and, if actually needed, story reply event fields the app supports; read back `GET /me/subscribed_apps` on `graph.instagram.com`. Public third-party conversations may require Advanced Access/App Review; do not assert they work under a development-only token. **Never share OAuth secrets/tokens in chat, GitHub or browser screenshots**.
3. Save only the following required settings via [Vercel Production Environment Variables](https://vercel.com/super10/codex-public-book-library/settings/environment-variables): `HH_CRM_MSG_INSTAGRAM_ID` (exact confirmed `me.id`), `HH_CRM_MSG_INSTAGRAM_USERNAME=tao.ideas`, `HH_CRM_MSG_INSTAGRAM_TOKEN` (encrypted), `HH_CRM_MSG_META_APP_SECRET` (encrypted), `HH_CRM_MSG_META_VERIFY_TOKEN`, `HH_CRM_MSG_META_API_VERSION` (supported `vNN.0`), `HH_CRM_MSG_INSTAGRAM_ENABLED=true`, **`HH_CRM_MSG_INSTAGRAM_INBOX_APPROVED=true` only for owner-approved controlled activation**. Leave global `HH_CRM_MSG_PRODUCTION_APPROVED` unchanged; do NOT enable general Meta campaigns. Vercel environment changes require a new proper production deployment to take effect; confirm READY SHA/domain.

Then sign in to [owner CRM Messages](https://holistichouse.vercel.app/ru/app/messages) → **Channels → Instagram · @tao.ideas → Connect**, which checks the actual Meta professional identity and `messages` subscription before registering the existing CRM account. From a separate consenting Instagram account, send one neutral DM and one supported story reply, then check exact inbox thread, message text and unread, send a neutral operator response from CRM (within Meta reply window), and read back actual delivery on the **other Instagram account**. Replay the same signed webhook update and check one thread / one event; test another Instagram page ID, tampered HMAC, a STOP, and EN/RU/ES UI.

## Distinctions / acceptance

- **Included:** Future API-deliverable Instagram private messages, message text, story reply text, type-only attachment markers, owner CRM inbox and manual replies after official configuration.
- **Not included:** Public comments, historical conversations unavailable from the API, group chats, encrypted end-to-end private features Meta does not expose, actual image/audio/video bytes, automatic replies to all DMs, marketing pixels, sensitive notification forwarding, Meta Business registration/Advanced Access approval. These require separate provider capabilities, consent or scoped implementation.
- [ ] Scoped pure tests and canonical CRM source tests + CI/build/typecheck pass exact SHA.
- [ ] Owner confirmed Instagram professional identity + permission + webhook subscription (not just configured keys).
- [ ] Meta signed test DM → hashed/one owner CRM thread, no duplicate on replay; wrong IG ID rejected.
- [ ] Manual owner reply → provider send accepted **and** tester sees it in Instagram.
- [ ] 320/390/430px real authenticated owner Messages; no cross-tenant access, STOP works.
- [ ] Production Vercel READY exact merged SHA + domain + site/webhook/provider E2E.
- [ ] Update #2257/#985 only with observed results, not inferred from public HTTP 200.

If the Meta API/App Review cannot read DMs, do **not** scrape Instagram, bypass privacy with browser automation, or claim Metricool publishing access equals messaging access. Preserve the working Telegram diagnostic and public web form.
