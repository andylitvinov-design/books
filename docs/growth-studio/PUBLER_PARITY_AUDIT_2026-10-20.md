# HH Growth Studio vs Publer — factual parity & delivery audit, 2026-10-20

> **STATUS: NOT AT PARITY.** Code may exist in PR #1232, but this document must not be interpreted as proof of production deployment or connected provider permissions. The system must never indicate “scheduled” or “published” merely because a draft exists. Primary user request: reach at least Publer reliability, exceed it through Holistic House content → campaign → CRM conversion traceability.

## Verified comparison baseline
Publer's published help center currently lists 13 network families (Facebook, Instagram Business, X/Twitter, LinkedIn, Pinterest, Google Business, YouTube, WordPress, TikTok, Telegram, Mastodon, Threads, Bluesky) and provides publishing queues, platform formats, recurring/recycling, CSV/bulk, media library, RSS, account presets and analytics. Capabilities differ by plan and provider API limitations.

Source references, reverify on changes:
- https://publer.com/help/en/article/what-social-networks-are-supported-npoun1
- https://publer.com/help/en/article/what-is-included-in-publer-business-1c57hsq
- https://publer.com/help/en/article/what-post-types-are-supported-and-what-are-their-limitations-1687rte
- https://publer.com/help/en/article/whats-the-difference-between-recycling-and-recurring-posts-y542y7/
- https://publer.com/help/en/article/how-to-set-up-a-posting-schedule-cxg8y2/

## Capability audit

| Capability | Publer documented | HH Growth Studio at this checkpoint | Gap / acceptance |
|---|---|---|---|
| 13 mainstream networks | Listed | All 13 can be selected as **draft targets**, plus Eventbrite/Meetup/manual; only optional Telegram send-now adapter exists | No false connected/published claims; each network needs authorized account, verified provider ID, media and receipt |
| Calendar | Real external scheduling | Editorial `planned_manual` only | Separate `provider_scheduled` with external post ID and target account after authorized adapter |
| Bulk posts / CSV | Yes | Bulk creator, CSV aliases, 500-row preview with atomic <=20 batch and replay-safe IDs | Verify Publer export on actual owner data; media import, comments/labels/boards unsupported and must be disclosed |
| Media | Upload/library/resize and limits | Public-URL references with alt text, read-only gallery | Secure licensed upload/CDN, optimized per network, captions/thumbnail variants, QA |
| AutoSchedule/time slots | Yes | Not implemented | Durable per-channel queue, time zone, collision detection, rate limits and provider reconciliation |
| Recurring/recycling | Supported with network exceptions | Not implemented | Per-platform anti-spam policy, opt-in, expiry, pause and deterministic queue deduplication |
| RSS / evergreen | Yes | Not implemented | Public-only RSS ingestion, author approval and cadence limits; never from private clinical routes |
| AI writer + repurpose | Yes (plan dependent) | Author-written EN/RU/ES variants only, no paid AI call | Explicit reviewed source, multilingual editorial review, cost cap, approval |
| Analytics | Network engagement | CRM marketing attribution exists separately; growth studio has local draft/receipt counters only | Official analytics scopes, immutable platform receipts, first-party verified lead, booking & payment reconciliation; `not measured` when unknown |
| Collaboration / workspaces | Teams/workspaces | One owner with brand selector, no SaaS team RBAC | Role-based approvals and tenant isolation later |
| Instagram/Pinterest/video special requirements | Network-specific validation | Capability manifest & advisory format checks; not external API validation | Account-specific final provider validation; never auto-convert a static MP4 into playable Story/Short without verifying constraints |
| Actual deliveries | Provider IDs and status | Telegram Bot API owner-confirmed send when configured; getChat + bot admin permission + explicit confirmation + receipt/ambiguous state | Real production permissions and provider receipt still unverified |
| YouTube | Direct integrated upload | Separate existing owner YouTube uploader linked; OAuth/target authorizations must be verified | Keep unlisted public-site master workflow #219; no private client videos on YouTube |
| Ads / CRM attribution | Social analytics | Distinct potential HH advantage: real verified lead/booked/paid from existing CRM specification #988 | Implement consent-permitted join and truthful payment readback after privacy review |

## Current integration truth — not inferred from “selectable”
- **Telegram**: optional dedicated Bot API, separate owner-confirmed send; server secret names must be provisioned and a real public channel checked. “Environment configured” != “rights verified”. The read-only check requires `getChat` channel identity, `getMe` bot identity and `getChatMember` status=`administrator` with `can_post_messages=true` (or creator). The adapter must never retry an ambiguous send.
- **YouTube**: existing `/admin/youtube-upload`, owner RU/EN target checks; no automatic linkage of ChatGPT's Metricool connector to Next.js runtime and no assumption OAuth is active. Source-of-truth `ai-projects-brain#219` and latest comment.
- **Metricool**: the ChatGPT connector can retrieve one user brand with a Russian YouTube ID, but this is not the same as a Vercel runtime publishing credential. Do not mark any site account connected from this.
- **Meta, LinkedIn, Pinterest, X, TikTok, Threads, Bluesky, Mastodon, WordPress, Google Business**: no verified HH site OAuth account/messaging publishing adapter at this checkpoint. Content can be prepared, copied and exported, **not auto-delivered**.
- **Eventbrite / Meetup**: site may reuse separate TorontoTantra Event Publisher. Actual event publishing requires a specific authorized provider event, host, official external URL and proper rights; never equate local draft with an Eventbrite/Meetup listing.
- **No fake conversions**: `PUBLIC_ANALYTICS_AVAILABLE=false` remains in place pending consent/privacy release review; protect client cabinet, test scores, symptoms and records from campaigns.

## Publication contract — mandatory to call parity
1. Verified owner & exact brand-to-provider-account ID mapping; OAuth scopes and expiry; secrets server-only. Do not silently switch language/account.
2. Draft/content source version pinned (public-published only), media rights, aspect ratio, alt text/captions, platform validation.
3. Independent editorial approval records exact payload hash, target account, destination URL, date/time, locale and privacy. Editing any field invalidates approval.
4. Scheduling confirmation contains provider scheduled-post ID, account ID, requested time, actual provider readback and timezone. Distinguish scheduled-on-platform from **manual calendar plan**.
5. Safe durable worker: idempotency per account+content+occurrence, no duplicate after timeout, bounded backoff, provider rate limits and manual hold on unknown delivery.
6. Receipt must include actual provider post ID and status; verify public visibility where applicable; never mark published before provider readback.
7. Media validation includes service type (e.g., Instagram photo vs Reel, YouTube Short vs 16:9) and channel requirements; no stock-Avatar substitution.
8. Owner UI shows independent statuses `not_connected`, `configured_unverified`, `permission_verified`, `draft`, `approved`, `queued`, `provider_scheduled`, `published`, `failed`, `delivery_unknown`, `manual_required`.
9. Per provider, integration acceptance: intentionally small authorized test post, provider ID/readback, correct account/visibility, iPhone & desktop verification and reverse/cancel behavior.
10. Analytics: network engagement != verified lead; payment/captured only on actual provider/ledger record. Every unknown metric displays `not measured`.

## Safe release sequence
A. Fix PR #1232 JSX and reconcile current production branch; make exact-merge CI + Next build green before any release.
B. Verify owner-only author actions, Redis saved draft reload, network capability warnings, CSV export/import on iPhone/WebKit.
C. Release Growth Studio as **editorial MVP**, clearly labelled manual except optional verified Telegram send-now. Do not cancel Publer.
D. Provision official provider accounts and authorizations one at a time; implement scheduler and adapter audit receipts. Start with already authorized YouTube/Metricool where technically possible.
E. Implement social media reporting + first-party CRM attribution with separate privacy gate. At this point measure actual campaign throughput/cost and decide Publer migration.
F. Publer subscription migration: only after channel-by-channel parity with verified real schedules and no missed posts. Do not silently cancel/rebill existing Publer subscription.

## Project references
- Implementation [books PR #1232](https://github.com/andylitvinov-design/books/pull/1232); scope tracking [books #1214](https://github.com/andylitvinov-design/books/issues/1214).
- AI-video architecture [brain #218](https://github.com/andylitvinov-design/ai-projects-brain/issues/218), publishing SOP [brain #219](https://github.com/andylitvinov-design/ai-projects-brain/issues/219).
- CRM/source conversion [books #988](https://github.com/andylitvinov-design/books/issues/988), privacy pipeline [books #801](https://github.com/andylitvinov-design/books/issues/801), marketing [books #223](https://github.com/andylitvinov-design/books/issues/223).
