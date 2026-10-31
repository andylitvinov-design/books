# Holistic House XP · Энергия творчества
Date: 2026-10-30 · Engineering contract v1 · Draft pending release

## Outcome and economic model
One account, TWO clearly separated views: verified CAD service-credit wallet (existing
PR #2634), and creative-energy XP used for media actions. We do NOT launch a second
checkout or revive draft PR #2631 (Stripe). All cash funding remains through the
existing approved PayPal/Square catalogue ONLY, and remains OFF until merchant
approval. Promotional XP is non-cash, non-transferable and has no cash-out.
Purchased wallet credit converts **on spending** at fixed rate CA$0.10 = 1 XP.
No up-front exchange step, cash-like transferable tokens or separate money account.

The first prices are: local Basic video 0 XP, video with optional hypnoaffirmations
10 XP, AI meditation script 10 XP, AI voice +10 XP, personalized script +20 XP,
true expensive AI video +50 XP. Feature add-ons can combine. A price/quote must
be shown before the user initiates the relevant action. Default FREE local
renderer stays free when the premium feature is not selected.

Only `hypno_video` is currently wired to the real Video Studio local recorder.
Other paid AI features are future capability flags and MUST NOT be enabled until
they actually deliver valid files. No invented remote render, no claim of
therapeutic correction or subliminal efficacy.

## Earning XP
- New customer who follows the invite link and creates/validates an account:
  +10 XP for inviter, once per new invitee. Requires confirmed email, account
  not older than seven days at claim, no self-referral, first attribution only,
  max 10 referrals per inviter over any 30 days.
- +5 XP to the account holder on their FIRST validated completed psychological
  assessment in the site's server record; no reward for merely opening a test.
- +20 XP for a paid or delivered referred service/consultation is a **planned**
  promotion only. NEVER grant on a submitted booking or a user-supplied payment
  screenshot. Requires a separate trusted fulfilment event and a refund/revoke
  policy first; therefore deliberately not enabled in this release.
- A free consultation remains free; there is no paid-wallet credit for signing up
  for one, and we do not solicit unnecessary medical details in referral events.

## Server consistency contract
Private FORCE-RLS tables `app_private.xp_invites`, `xp_referrals`,
`xp_rewards`, `xp_charges`. Client API: `/api/app/xp/catalog`, signed-in
`status`, `sync`, `hold`, `complete`, `release`. Actor is verified
using Supabase `getUser()` and server-side DB session scope. No browser-supplied
amount, provider, balance, award, or redeem value is trusted. An immutable
operation UUID makes each hold idempotent. Row lock on `app.accounts` serializes
concurrent holds. Inviter advisory lock serializes referral limit. Unique
constraints stop replay. Holds reserve promotional XP first, then available
CAD in 10-cent units. CAD availability is calculated as `wallet_entries` net
verified deposits and reversals, LESS held/completed XP CAD spend, and is
reflected in the existing wallet's display. If a job fails, is cancelled,
expires (30min) or tab closes, hold is released. No award on incomplete output.
A successful local video export confirms after actual nonempty Blob creation,
before exposing the downloadable result.

**Limitation / go-live gate:** Because existing Canvas/MediaRecorder exports
are generated on the user's device, a hostile custom client could bypass
client-side preview gating. The server can enforce XP balance and confirmation
for the official UI but cannot independently verify the artifact. Paid rendering
or premium proprietary assets should run through a trusted worker with signed
artifact proof before general monetization. Do NOT sell 'unbreakable' DRM.
No provider charges are initiated for Video Studio Basic.

## Configuration and rollout
All flags OFF by default: `HH_XP_ENABLED`, `HH_XP_SCHEMA_APPROVED`,
`HH_XP_CHARGE_HYPNO`, `HH_XP_WALLET_REDEMPTION_APPROVED`.
Ready-only AI flags: `HH_XP_MEDITATION_READY`, `HH_XP_VOICE_READY`,
`HH_XP_PERSONALIZATION_READY`, `HH_XP_AI_VIDEO_READY`.
Existing CAD wallet flags and merchant acceptability terms remain separate.
Before enabling ANY cash-to-XP conversion, review PayPal CA & Square CA
prepaid/closed-loop service-credit policies, relevant tax/consumer protection,
expiry/refund/chargeback/user deletion terms, and test signed receipt
reconciliation. Payment method remains OFF without merchant approvals.
Do NOT enable legacy Stripe.

Deployment sequence: #2634 wallet first (tests, DB, Vercel READY), then this
XP PR rebased on production and its own migration applied after RLS review.
Run `node --test tests/billing-xp.test.mjs`, `npm run test:monetization`,
`npx tsc --noEmit`, ESLint and real Chromium/WebKit media export tests. Verify
signed-in two-tab race, duplicate operations, referral spoof, test result bonus,
expired holds, interrupted recording, insufficient XP, CAD refund, no double
credit, RU/EN/ES mobile text and original free media export. After release
check exact production Vercel SHA, no claims of payment activation without live
merchant evidence.

## Mobile UX
On the cabinet Balance screen show one compact card with earned XP, XP drawn
from verified CAD balance (only when approved), invitation copy (+10), activity,
and the existing PayPal/Square balance top-up. In Video Studio, show 10 XP next
to hypno/video option and a contextual link to Balance. Avoid second modal
or checkout. EN/RU/ES. Keep free Basic recording/export accessible.

## Follow-up
Introduce an authoritative paid/delivered service event for consultation +20 XP
and a first-party renderer/server-verified deliverable. Add abuse dashboard,
reward clawback audit and product-level unit economics before broad rollout.
