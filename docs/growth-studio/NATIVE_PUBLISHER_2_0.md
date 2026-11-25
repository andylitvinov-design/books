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
| Instagram | Native Meta Graph JPEG Feed, Business JPEG/MP4 Stories and owner-approved MP4 Reels | Meta app, verified Page and professional Instagram OAuth, server flag |
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

## Native Instagram Reels (owner-reviewed, not unattended)

A Reel is a separate Instagram placement (`reel`) in the **existing**
Growth Studio composer. A public MP4 from the selected branded site is required;
private video-library files, client cabinet assets and unreviewed uploads are
not exposed or published. The public file must answer to HEAD with
`Content-Type: video/mp4`, without redirect, and be <=1 GB when
`Content-Length` is provided. Meta's codec, frame-rate and duration validation
is authoritative: use H.264 or HEVC, AAC, 9:16 recommended, 23-60 FPS,
3 seconds to 15 minutes.

Only an approved exact revision, selected authorized Instagram
Business/Creator account and irreversible owner confirmation permit the
existing Meta Graph API Page token to create one `media_type=REELS` container
with `video_url`, `caption` and `share_to_feed=true`. The server reads
`status_code`; it publishes that container only after `FINISHED`.
Unfinished processing is saved as `delivery_unknown/provider_processing`;
an owner can resume that same known container without uploading again.
Ambiguous container creation, publication or readback never triggers a
blind retry. A confirmed `published` receipt requires a matching numeric
Meta media ID, `VIDEO` / `REELS` readback, valid provider timestamp and
real Instagram /reel/ permalink.

The manual phone handoff remains available when Meta OAuth is not connected;
it is not a provider-confirmed post. The existing flag
`HH_GROWTH_INSTAGRAM_PUBLISH_ENABLED` remains OFF by default. Reels do
**not** enable automated scheduling, a second token store, mass publishing
or paid Metricool/Meta services. The real Live gate still requires exact-HEAD
CI, protected merge, hourly Vercel release, verified owner OAuth/Meta
permissions and one explicitly approved public test Reel with real ID/link.
