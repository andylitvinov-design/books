# Holistic House Video Studio: Basic / Smart / Pro
**30 October 2026 · Current proposed public prices (USD)**

## Three honest plans on the FIRST editor screen
| Plan | Price / 30s | Actual included footage | Shipping state |
| --- | ---: | --- | --- |
| Basic | $0 | Brand's real MP4 montage OR novel first-party procedural Canvas animation, local audio, photos with separate consent and captions | New generation part only after focused CI + merged release |
| Smart | $2 | Up to 30s finished hybrid video, 5–10s one paid AI-originated shot plus 20–25s local (no promise of 30s neural-generated frames) | Display proposed pricing and working local storyboard; **paid AI job/checkout disabled** |
| Pro | $9.90 | Up to 30s finished output, potentially multiple distinct AI shots, more production refinement and quality review | **paid AI job/checkout disabled** |

All prices USD and proposed, final tax/region terms/rights TBD. A price label does not prove the current provider quote is available or that an order can be delivered. The first Smart video is a **planned welcome grant** per eligible verified account, not an unlimited free generation or currently spendable entitlement. No charge before a server-verified order and owner budget allocation. UI may prepare the trusted Cinematic Director storyboard without spending credits.

### Economics
- Provider pilot candidate: HeyGen Video 1.0, 5–15s shot. Post-promo API rates reportedly $0.02/s 480p, **$0.03/s 768p** and $0.10/s 1080p (confirm exact provider pricing and offer at time of purchase).
- Smart 10s × $0.03 ≈ **$0.30 nominal AI cost**, 1 additional allowed attempt ≈ $0.60, plus credits/reservation, moderation, payment fee, storage, delivery, tax. Limit per-order external spend to an owner-approved amount (suggest initial $0.70 maximum per $2 order) and fail closed if quote exceeds it. No blanket quality guarantee or silently infinite retries.
- Pro can spend up to ≈$3 on 30s 1080p at the standard $0.10/s rate before retries. Limit spend with a clear guard (suggest initial $5–6 cap with explicit user/owner intervention if exceeded) rather than promising an unlimited "cinematic" attempt. Source API quote beats estimates.
- Starter free gift requires **company-funded per-account quota** and total daily/monthly budget. It cannot use the user's HeyGen Creator credits as if they were API credits.
- Avoid 30s all-AI on Smart: at $2 it is margin-sensitive, especially with payment fixed fees and rerenders.
- If a provider fails or policy rejects a brief, show an explicit failure/retry/refund action; do not silently replace purchased Smart/Pro with free Basic.

### Server release gate for a REAL Smart order (not shipped yet)
1. **Production API access and funding:** first-party server-only HeyGen Video model or alternative signed API key, separate API balance, explicit tested 5–10s text-to-video real job, invoice and rights. Installed HeyGen ChatGPT plugin / Creator subscription do NOT establish a website API account. Production secrets inventory currently has a Kling API key with paid flags, but no verified HeyGen/Higgsfield/Runway server API key; existing Kling key not proof of a usable paid balance.
2. **Safe prompt translation:** public visual words and style/shot/negative/seed inputs => sanitized provider prompt. Never send raw personal consultation history, protected test data or mental health goal to remote image/video providers. User-owned reference image requires explicit right/consent to send externally (separate from Basic local use).
3. **Durable job / billing ledger:** user_id, source_plan, order_id, unique promotion redemption and idempotency key, provider source/model/duration/resolution/cost quote/currency/expiry/receipt, approved cost cap, queued/submitted/completed/failed/delivered state, checksum and signed private output URL. Database unique constraints must prevent repeated free claims/duplicate charge and double submission.
4. **First-free Smart grant:** upon verified sign-in, atomically reserve one eligible grant BEFORE submission; enforce daily campaign spend budget, rate limits and per-user max cost; grant held when job is pending and returned only for verified failed/no-provider-delivery, not free repeat button. On failure, avoid showing "completed" without an actual signed playable MP4.
5. **Pricing/payment:** until a supported provider webhook validates the $2/$9.90 payment (or redeemed free entitlement) no provider job is submitted. Do not trust a browser boolean, coupon flag or manually clicked payment button.
6. **Worker and webhook/poller:** accept job 202, enqueue in durable worker (not blocking Vercel request), submit exactly once using idempotency, poll/webhook with signature if available; timeout and capped retry. Persist provider asset, run ffprobe checks and visual acceptance, combine with permitted local media, voice and music; never return another user's video.
7. **Delivery and QA:** run real text-prompt pilot with sanitized test content, verify expected first/last frames, at least one moving region, encoded video/audio, duration/aspect, no person/unsafe mistake. Make signed private download and account history only after storage RLS and real iPhone Safari signed-in/account-switch tests.
8. **Release:** precise SHA CI, unit security/billing tests, provider live paid test in a capped non-private owner sandbox, production Vercel READY+alias+smoke. Add monitoring for cost/order, retry rate, failure rate, refunds, vendor outages and user satisfaction.

### UI deliverable of this PR
The first screen has **three selectable tariff cards Basic/Smart/Pro** with proposed USD amounts and real descriptions. Basic continues the working generator/montage. Smart/Pro selection reveals a truthful "not connected yet" panel, a working "Prepare AI storyboard" jump, and the "Create a free draft" action (not disguised paid AI). No purchasing/charging/grants are activated by selecting a card. All current six editor panels and privacy rules remain intact. Parent PR #2606's core free engine is integrated on current production baseline without replacing unrelated newer workflow and browser changes.

### Release interpretation
Do NOT claim "Smart available" or "first Smart redeemed" until the live provider E2E, payment/entitlement and actual media receipt all pass. The present deliverable is Basic plus clear tier UX and precise backend requirements for Smart/Pro.
