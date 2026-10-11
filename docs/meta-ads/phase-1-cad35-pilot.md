# Meta Ads phase 1 — paused CAD 35 pilot

**Status:** DRAFT / PAUSED / NO BILLING / NO PUBLISHING. This is a local upload sheet, not a Meta campaign.

## Immutable phase-1 limits

| Setting | Value |
| --- | --- |
| Campaigns | 1 |
| Ad sets | 1 |
| Ads | maximum 2 |
| Currency | CAD |
| Daily budget | CAD 5 |
| Duration | 7 days |
| Lifetime hard cap | CAD 35 |
| Phase 2 | blocked until separate owner approval |

If Ads Manager requires any daily minimum above CAD 5, a lifetime budget above CAD 35, billing, or a different currency, stop. Do not increase any number. Record `META_MINIMUM_EXCEEDS_APPROVED_BUDGET` and leave the campaign paused.

## Local campaign configuration

`lib/meta-ads-campaign.js` is the source of truth for the ceiling. It validates the paused state, one campaign, one ad set and at most two ads. No Meta API token, Pixel ID, Conversions API credential, payment method or account ID is stored in this repository.

Recommended upload shell, only after the owner confirms the platform accepts the limits:

```text
Campaign: META_TRAFFIC_CA_FreeReview_2026-10_PAUSED
Objective: Traffic to public landing page (not a sensitive-lead conversion objective)
Ad set: CA_Adult_EN_Broad_FreeReview_PAUSED
Destination: https://holistichouse.vercel.app/en/services/free-situation-review?utm_source=meta&utm_medium=paid_social&utm_campaign=free_review_ca_oct&utm_content={creative-id}
```

The release owner must confirm targeting, age, placements, Meta policy suitability and the available budget in Ads Manager. Do not create a lookalike, customer list, retargeting audience or sensitive-interest audience.

## Two ad variants (English)

Both variants use neutral language and the same public page. They do not mention medical, mental-health, test-result, diagnosis, cure or guaranteed-outcome claims.

### Ad 1 — personal written review

- Asset: `public/ads/meta/free-review-andrey-feed-4x5-v1.png` (4:5) and `public/ads/meta/free-review-andrey-stories-9x16-v1.png` (9:16).
- Primary text (120 chars): `Clarify a goal or situation with a simple drawing and a personal written review. Free, online, no call required.`
- Headline (39 chars): `Free personal situation review`
- Description (28 chars): `Written response, not a call`
- CTA: `Learn more`
- UTM content: `andrey-library-portrait`

### Ad 2 — drawing process (hold)

- Asset status: `OWNER_ASSET_APPROVAL_REQUIRED`; do not upload a stock image or generate a new likeness.
- Primary text (116 chars): `A short coaching form and a hand-drawn “Me · Goal · Problem” can start a personal written review.`
- Headline (37 chars): `Start with a drawing and a goal`
- Description (27 chars): `Free written situation review`
- CTA: `Learn more`
- UTM content: `drawing-process`

The two supplied crops were derived only from the already-public `public/images/holistic-house/andy-about.png`. They contain no overlay text. Before upload, the owner must confirm this photo is approved for paid Meta use; otherwise remove Ad 1 and leave the pilot blocked.

## Receipt, privacy and measurement

The landing form is deliberately split:

1. Questionnaire text and drawing remain local until a visitor voluntarily copies them and sends them in WhatsApp.
2. A minimal first-party receipt stores only encrypted email, chosen reply channel, broad topic, locale and allowlisted UTM tokens after a same-origin POST succeeds.
3. Only this persisted receipt has the status `received`. A copied message, WhatsApp handoff or GA4 event is never a received lead.

Migration `20261011235000_hh_public_lead_receipts.sql` creates the private `app.public_lead_receipts` ledger. `status` may be updated internally from `received` to `contacted`, `qualified`, `paid`, or `archived`; `paid` requires `paid_at`. The table has RLS and grants only the backend role. It stores no questionnaire answers, drawing, test result, report, medical data or Meta identifiers.

GA4 stays consent-gated and limited to public, allowlisted secondary events. Meta Pixel and Conversions API are **not installed or enabled**. Do not add them until the owner completes a separate privacy/policy review, confirms consent behavior and supplies a valid approved configuration. Existing CSP has no Meta host allowlist; keep it that way for this phase.

## Required owner actions before any spend

1. Apply the receipt migration using the existing guarded database workflow and verify that a first-party test receipt persists.
2. Confirm the existing public Andrey photo has paid-ad usage approval; approve or replace the second creative.
3. Provide authorized Meta Business/Ads Manager access, confirm account currency and whether CAD 5/day plus CAD 35 lifetime cap is accepted.
4. Confirm Meta policy review for the offer and target audience; do not treat the website disclaimer as platform approval.
5. Review the exact landing page in the Preview created by this PR. Only then may an owner create a paused draft manually.
