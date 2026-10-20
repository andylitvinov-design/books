# HH Growth Studio — owner connection and first-post acceptance
**2026-10-20 · RU · Access: owner-only · NOT LIVE until exact verified release**

## No secrets in chat, GitHub, client UI or screenshots
The product editor and integrations are delivered in **code**, not necessarily live. PR #1232 must first pass current-merge CI/Next build, merge into the actual production branch and have Vercel READY + protected owner login + Redis save/reload acceptance. No video rendering, social publishing, public listing or advertising happens in this preparation.

## Telegram: configure a real public HH channel for an explicit test
1. Open **[official @BotFather](https://t.me/BotFather)**, use `/newbot` or an existing owned bot, and keep its Bot Token **private**. Official tutorial: https://core.telegram.org/bots/tutorial . Do not paste the token into ChatGPT, screenshots, tickets, client storage or GitHub.
2. Add that bot as an administrator **only to the approved public Holistic House channel**, enable **Post Messages**. Verify the **exact public channel handle** `@yourrealchannel` (or verified numeric `-100...` ID). Do not use a personal/private DM or unknown group.
3. Open the current Holistic House Vercel project environment settings: https://vercel.com/super10/codex-public-book-library/settings/environment-variables and set **Production** server-only keys:
   - `HH_GROWTH_TELEGRAM_ENABLED=true`
   - `HH_GROWTH_TELEGRAM_BOT_TOKEN` = token from BotFather, stored as a secret
   - `HH_GROWTH_TELEGRAM_CHAT_ID` = exact owner-verified public channel username/ID.
4. After the code has passed QA and the desired source SHA is production, redeploy through the existing approved flow (do **not** bypass Vercel cost guards). Sign in to https://holistichouse.vercel.app/admin/login , open **Growth Studio**: https://holistichouse.vercel.app/admin/growth-studio (**only after deployment**). Expand **Connections and publishing methods** and click **Check Telegram access**. This performs **read-only** `getChat`, `getMe`, `getChatMember`; it succeeds only if bot identity and `administrator.can_post_messages=true` (or creator) match.
5. Prepare a **non-sensitive, owner-approved** public HH post, save, review exact text/link/media, **Approve**, then use the separate **Publish now to Telegram** control and confirm actual content/target. This **will publish**: do not perform a test until the exact post and target are explicitly approved.
6. Confirm Telegram message ID/link and correct public channel; reload admin record across devices. If `delivery_unknown` appears, **inspect the channel; do not press Publish again blindly**. Capture receipt for acceptance.

**Status as of the writing:** The Vercel environment audit did not find the three `HH_GROWTH_TELEGRAM_*` keys; the presence of Redis keys is not proof of working public posting. Bot credentials are not automatically inherited from the CRM private-chat integration.

## YouTube: existing owner-only uploader, not a social scheduler
1. Open https://holistichouse.vercel.app/admin/youtube-upload after practitioner login.
2. If no Google OAuth **Web Client ID** is present, create a web OAuth client via https://console.cloud.google.com/apis/credentials , enable YouTube Data API v3 via https://console.cloud.google.com/apis/library/youtube.googleapis.com and register `https://holistichouse.vercel.app` as authorized origin. Official instructions: https://developers.google.com/youtube/data/guides/auth/client-side-web-apps . Only the public **client ID**, not client secret, belongs in the approved admin setup.
3. Grant Google OAuth consent, **read back actual channel ID**. Existing RU target reference is `UCjWq6NHZTQkUr3bC3WbXXcw`; **EN is not assumed to be the same channel**. Verify status Unlisted and anonymous playback as required by the SOP.
4. Site-only public video: Andy's verified private HeyGen twin → human QA → canonical Google Drive master archive → YouTube Unlisted via approved publisher → lazy site embed. Private/client videos never use normal/unlisted YouTube delivery. Source: [AI-video SOP #219](https://github.com/andylitvinov-design/ai-projects-brain/issues/219) (latest dated comment).
5. This uploader is not a verified multi-channel scheduling adapter. Do not claim a Growth Studio post is live just because it has a YouTube target.

## Metricool: distinguish ChatGPT connector from the site's API
- The connected ChatGPT Metricool plugin can read **one brand** and an RU YouTube channel, but it does **not** transfer a token to the Next.js server. `not_connected_on_site` remains the correct label.
- Official API guide: https://help.metricool.com/basic-guide-for-api-integration-r97af . **As of 2026-10-20 this guide says API access requires Advanced or Custom**, not Free/Starter. Before designing a runtime Metricool adapter, inspect actual user entitlement and whether a paid upgrade is justified; do not assume the existing account/API or start a subscription.
- If eligible, owner retrieves API credentials only in Metricool **Account Settings → API**, stores them server-side using reviewed secret management, and uses the official `X-Mc-Auth` + userId/blogId specification. Test one owner-approved post with returned external post ID, provider readback and no duplicate on retry.
- The ChatGPT Metricool connector may schedule posts when the user provides exact content, target and date and explicitly authorizes scheduling, but that is **not** an autonomous site integration or 24/7 publisher.

## Meta (Facebook Pages and Instagram Professional), LinkedIn, TikTok, etc.
- **Meta:** official Meta App + owner Business/Creator account and permitted Page/scopes; review official options (Instagram Login and Facebook Login differ). Official Meta-owned collection: https://www.postman.com/meta/instagram/folder/u4g5a2a/instagram-api-with-facebook-login . Only support automatic publishing once exact account ID, app mode and readback are verified. Never use a personal Instagram password or browser automation as an API substitute.
- **TikTok:** Content Posting API, app review/verified account; video format and visibility constraints must be validated per account.
- **Pinterest:** Board must be selected. A pin cannot be sent only from a generic caption and URL.
- **Threads, Bluesky, Mastodon, X, WordPress, GBP:** independent official OAuth/permissions/API cost checks, exact account mapping and platform-specific media restrictions. Until then: manually prepared post, no auto-send promise.
- **Events:** Eventbrite/Meetup via existing TorontoTantra Event Publisher and authorized account/provider ID, otherwise assisted listings only.
- **Never** send client records, reports, conditions, testing data, private messages or sensitive audience lists to social networks or advertising pixels.

## Acceptance and when Publer can be replaced
Only after:
- 13 mainstream provider family connections are clearly marked as `verified` or `manual`, with no placeholder claiming success;
- the social channels the owner **actually uses** can schedule and publish on time via verified provider receipts;
- no duplicate/missing post in timed/timeout/renewed-token cases;
- iPhone Safari 320/390/430px and desktop reviewed;
- source/version/owner approvals, media/license and per-network content validation;
- real campaign results and CRM-conversions distinguished from clicks, without violating consent/analytics holds;
- owner approves migration and, separately, Publer subscription cancellation. **Do not cancel Publer automatically.**

## Source code and constraints
- Product implementation: https://github.com/andylitvinov-design/books/pull/1232
- Publer parity audit: `docs/growth-studio/PUBLER_PARITY_AUDIT_2026-10-20.md`
- Existing site/CRM: https://github.com/andylitvinov-design/books/issues/988
- Video SOP: https://github.com/andylitvinov-design/ai-projects-brain/issues/219
