# One-time WhatsApp personal materials invitation after Google signup — 2026-11-07
## Product decision
Only after **completed, server-verified first Cabinet onboarding**, display one **user-dismissible** modal in the existing PostSignupInstallOffer surface. Google sign-in remains the actual account session and no additional session/provider is created.
- Mobile: WhatsApp invitation first, optional existing PWA installation in the **same dialog**.
- Desktop / installed app: WhatsApp invitation only. On report Save continuation, return to the saved resource after dismissing this single dialog.
- Returning logins and aborted/failed onboarding never show the invitation; no timers, no sitewide popup, no recurring marketing prompt.
- RU/EN/ES localized copy. WhatsApp button generates only a public, generic, user-editable `wa.me` draft to the existing verified-in-source Holistic House contact from `lib/whatsapp-enquiry.js`; it contains **no account ID, medical information, test result, report link, token, recipient's phone or session cookies**. The visitor decides whether to press WhatsApp Send.
- This is **personal request only**, NOT marketing consent, auto-send, delivery confirmation, verified identity, official Meta Business Cloud API or CRM account link. Public free resources already inside Cabinet remain accessible without WhatsApp; bonuses/availability require practitioner response, not an invented free entitlement.
- Keep STOP/unlink and separate consent in the existing official provider-gated WhatsApp account-link API released in #3905. The corresponding private migration and provider registration remain independent release tasks; until configured, do not claim that manual WhatsApp `wa.me` contact automatically joins the CRM or links a phone to the signed-in Google Cabinet.
## Acceptance
1. New Google auth + verified onboarding save => one invite; same account on desktop and phone; cancel retains account and content.
2. Returning login, account switch, incomplete onboarding, report-save failure => no invite.
3. Android/iOS PWA setup remains optional in same invitation without duplicate bottom sheets, keyboard/focus trap, safe-area.
4. WhatsApp URL is prefilled exclusively with static RU/EN/ES text; never sent until the human taps Send; correct official public number from existing source, no PII.
5. Validate with existing `tests/holistic-house-post-signup-install.test.mjs`, full Core / IA / browser and code privacy checks; protected merge and Vercel READY served SHA independently of real WhatsApp recipient acceptance.
6. Once official Meta Business is available, complete signed WhatsApp challenge, RLS and full provider E2E before claiming verified Cabinet linking or automated personal material delivery. No new paid providers or sends.
GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES
