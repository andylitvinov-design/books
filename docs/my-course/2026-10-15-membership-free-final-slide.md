# Holistic House — Membership pricing, Free final slide, lesson completion

Approved 2026-10-15, with Premium €100 restored by user request. Supersedes the pricing and promotional timing in `day14-retest-daily-gate-subscription-offer-2026-10-13.md`.

## Commercial structure
- **Free**: €0; one active course; one optional Holistic House advertisement as the last slide of the **complete 14-day course**.
- **Advanced**: €20/month; up to five simultaneous courses, no promotional slide.
- **New-subscriber promotion**: first month **€10 (50% off)**, **then €20/month** from the second month. The €10 amount is an introductory price for the same Advanced plan, **not** a separate €10 recurring subscription.
- **Premium**: €100/month; up to five simultaneous courses, no advertising, included tests and one personal session per month (service and scheduling terms to be confirmed before checkout).
- Do not show old Start (€10/month) as a separate recurring membership. The €10 promotion belongs **only** to Advanced; Premium remains €100/month.
- Checkout is not activated by this change: show price terms but never imply a click charges or subscribes. Eligibility, taxes, renewals, invoices and discounts need account-bound verification in billing before activation.

## Course slide and save contract
1. Traverse **every authored slide** of each daily lesson in sequence. Safety options and ratings remain voluntary; they can be skipped but their slides still appear.
2. On **Free day 14**, add the first-party membership offer as the **final slide before completion**. Verified ad-free users do not see the offer; an entitlement-read error hides the offer rather than showing it to a possible paid member.
3. The final slide offers **Finish and save**; the client checks that every slide was reached and submits all authored slide keys in order. Authenticated server validates the expected sequence before saving.
4. Only on successful server save is the daily lesson marked complete, followed by a congratulatory confirmation. On day 14 also congratulate the learner on completing the **entire 14-day course**. The next lesson never unlocks from merely seeing a slide.
5. Closing early, interrupting the lesson or canceling an ad never marks it complete. Saved lessons can be reviewed without a second completion.
6. Expanded read-only textual lesson UI routes back to the slide player rather than saving directly. The obsolete `complete-day` API rejects new calls.
7. An ad is informational, never forces checkout, and never blocks safe early exit or a voluntary rating skip.

The server's slide-key acknowledgement checks order and count from the client but is **not** proof of human attention and does not prevent a malicious custom API client from fabricating client-side events. Practices and ratings are voluntary; no clinical outcome claim is made.
