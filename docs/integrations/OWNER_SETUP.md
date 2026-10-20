# Owner-only setup actions

Everything below is genuinely blocked by account ownership, provider consent,
or a potential charge. Do not send a value in chat, GitHub, screenshots or a
browser form outside the provider/Vercel secret UI.

1. **Supabase Auth security.** In the project Auth security settings, enable
   leaked-password protection. This is the one current Security Advisor
   warning. It changes sign-in policy, so confirm its user-impact in the
   [Supabase dashboard](https://supabase.com/dashboard/project/shervdixkaxurnaecioe/advisors/security)
   before saving.
2. **Resend.** In [Resend Domains](https://resend.com/domains), verify an
   owned sending domain (SPF/DKIM), a real reply-to mailbox and the postal
   sender details. Create an API key and webhook signing secret with least
   privilege, then put the names in
   [Vercel Production environment variables](https://vercel.com/super10/codex-public-book-library/settings/environment-variables).
   Keep `HH_CRM_EMAIL_ENABLED` off until the prescribed one-recipient test
   in `E2E_ACCEPTANCE.md` passes.
3. **Twilio.** In [Twilio Console](https://console.twilio.com/), use an
   existing owned Messaging Service or deliberately acquire/verify one. This
   may have a cost. Enable Advanced Opt-Out, set the exact callback URL from
   `ENV_REGISTRY.md`, verify CASL sender/contact details, and set a consenting
   owner test phone. Keep `HH_CRM_SMS_LIVE_APPROVED=false`.
4. **Telegram.** Create or select a dedicated Holistic House bot in
   [BotFather](https://t.me/BotFather); do not reuse `@ezohata_diagnostics_bot`.
   Store its token only as a Production secret, confirm `getMe`, and set the
   signed callback. First use only the owner allow-listed pilot chat.
5. **Meta messaging.** In [Meta for Developers](https://developers.facebook.com/apps/)
   and [WhatsApp Manager](https://business.facebook.com/latest/whatsapp_manager),
   identify the owned app, WABA/phone, Page and professional Instagram account.
   Complete required permissions/App Review and configure the official signed
   callbacks. No WhatsApp Web or personal-account workaround is acceptable.
6. **YouTube/Drive.** In [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials),
   use the existing OAuth Web Client with origin
   `https://holistichouse.vercel.app` and scopes `youtube.upload` and
   `youtube.readonly`; then use the existing
   [owner uploader](https://holistichouse.vercel.app/admin/youtube-upload).
   Authorize access to the existing Drive `AI Videos/Homeopathy/...` tree for
   a SHA-256/visual-QA handoff. Do not re-render or re-upload the known private
   asset, and do not expose client media.
7. **GA4/Search Console.** Grant read-only owner access to the existing GA4
   property and Search Console property, then perform the public consent and
   DebugView acceptance check. Do not turn the privacy hold off simply because
   the Measurement ID exists.
8. **Cloudflare.** Grant read-only dashboard access to the account that reports
   the 100,000 KV reads/day. Identify the exact Worker, zone and namespace in
   provider analytics first; this repository cannot safely attribute that
   spend.
9. **Advertising/event/social accounts.** Supply owner access only after
   approving the exact destination event/content. Do not add billing, purchase
   Meetup/Luma plans, launch Google/Meta campaigns, or publish from Metricool
   as part of setup.
