# Holistic House Native Publisher 2.0

Status: native foundation in Growth Studio. This is original implementation
using official platform APIs, not a Metricool API proxy, imported source code
or workaround for social-network developer permissions.

Source of truth: Holistic House owner-only /admin/growth-studio and existing
Publer+ program: https://github.com/andylitvinov-design/books/issues/1214

## Working architecture

One content record in the existing server-side Redis CAS editorial store:
public source → draft → owner approval → exact network account + variant →
controlled send → provider readback → confirmed, or delivery_unknown.

Approved content remains platform-specific and editing resets approval.
Never infer provider connectivity from a channel card, a client ID, or the
existence of an installed ChatGPT integration. Never automatically retry an
ambiguous delivery, silently drop media, or publish private client materials.
Post ID and provider timestamp are evidence; a manual checkbox is not.

Current platform matrix:

| Network | Owned implementation | External prerequisites |
| --- | --- | --- |
| Telegram | Native Bot API text/photo/video with owner confirmation | Bot administrator rights and server token |
| Instagram | Native Meta Graph JPEG Feed and Business JPEG/MP4 Stories | Meta app, verified Business Page and Instagram OAuth, server flag |
| Facebook Pages | New official Meta Graph text/link Page adapter, exact Page and readback | Meta app, pages_manage_posts, CREATE_CONTENT, Facebook-specific flag |
| YouTube | Existing native RU/EN owner uploader | Verified Google OAuth and channel |
| TikTok | Draft/assisted only, not direct public posting | Approved Content Posting API, creator grant, app audit |
| Threads | Draft/assisted only | Official Threads login and publishing scopes |
| LinkedIn | Draft/assisted only | Posts API scopes, member or organization grant and asset pipeline |
| Pinterest | Draft/assisted only | OAuth writer permissions, boards and verified media |
| Bluesky | Draft/assisted only | Owned account session and AT Protocol writer |
| Mastodon | Draft/assisted only | OAuth and trusted server instance |
| X / Twitter | Draft/assisted only | Official API access, quota and cost approval |
| WordPress | Draft/assisted only | Authenticated owned site and article taxonomy |
| Google Business Profile | Draft/assisted only | Eligible, verified business location and access |
| Eventbrite / Meetup | Existing independent event workflows | Organizer approval and API capability |

## Native Facebook Page slice

Existing Meta OAuth encrypts both user and Page access tokens using server-side
AES-GCM in the existing Redis namespace. The Facebook Page is not a guessed
account: it must exactly match the Page already verified as linked to the
selected Wizards Secrets or Andy Therapist Instagram profile.

Additional pages_manage_posts scope is requested without making it mandatory
for Instagram; Facebook writing requires this grant and Page CREATE_CONTENT
task at actual send time. A separate environment variable,
HH_GROWTH_FACEBOOK_PUBLISH_ENABLED, is OFF by default. Never turn it on
before explicit owner setup and a safe real test publication.

The initial Facebook adapter supports **only text and public link**.
Page photos, video, Stories, Groups and personal timelines are not silently
posted via the text endpoint. They are distinct future adapters.

One explicit owner action:
- confirm selected Page ID, post body and public tracked link
- write Redis sending claim with strict expected revision
- POST to official Page feed endpoint once
- GET the exact returned Page post ID; require matching ID,
  is_published true, and provider created_time
- store provider receipt with real timestamp; if any result is ambiguous,
  mark delivery_unknown and do not retry automatically

All tests use synthetic tokens and network responses; they are **not** proof
of Facebook authorization, public visibility or genuine Meta delivery.

## Publisher parity: next increments

1. Unified connection health per platform/account with official OAuth and
   revocation. No passwords, scraping, API scope bypass or proprietary tool.
2. Owner-approved native scheduling: durable job and audit ledger in existing
   authorized infrastructure; one occurrence/account/revision key, bounded
   worker, dead letters, provider rate limits and receipt reconciliation.
   Current calendar is manual, not an unattended publishing queue.
3. One campaign → independent EN/RU/ES platform-specific drafts, previews,
   formats and approvals, with no crossposting to unselected accounts.
4. Media preparation: originals, rights and provenance, JPEG and MP4
   conversion, vertical reels/stories vs landscape video. No private files.
5. Reporting and marketing: exact provider insights where authorized and
   privacy-permitted first-party attribution; missing stats remain unknown.

## Release and genuine LIVE criteria

Code tests, protected GitHub merge, production Vercel READY/SHA, verified
owner session, provider OAuth and a real public post ID are independent steps.
Official Meta credentials and grants must be obtained from the owner through
provider UI and stored privately in Vercel. Do not put credentials in GitHub,
chat, browser JavaScript, screenshots or client logs.

To validate @wizards.secrets: configure Meta app and redirect URL, connect the
exact Instagram Business/Page profile, verify scopes, enable the selected flag
only after credentials and permissions pass, explicitly approve one PUBLIC
test, check Meta readback, verify actual visibility, save provider ID and
timestamp. Repeat this authorization process independently for each network.

Never claim full Metricool/Publer parity or unattended multi-network LIVE
before these per-platform contracts and physical acceptance pass.
