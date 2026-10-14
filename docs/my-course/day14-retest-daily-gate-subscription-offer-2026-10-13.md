# My Course 14-day closure, calendar-day pacing and paid plan offer

Approved October 13, 2026. Supersedes any description treating the last day as merely another lesson.

## Journey

1. Before enrolment: the user chooses and saves their own original assessment battery (often five fixed tests for curated courses). Only actual compatible owner-owned results enable course start. The cycle's original baseline is **frozen as of its trusted server-created timestamp**.
2. Days 1–14: **at most one new lesson in each local calendar day, per course/cycle**. The current day's practice can be reviewed without an additional save, reward or streak. Delaying, pausing or skipping does not create make-up lessons on a single day.
3. Every lesson: immediate focus self-rating 0–10 → short authored exercises → repeat the same immediate question → server-confirmed two-number summary. Separate 24-hour observations remain separate.
4. After a successful daily save: show optional **first-party membership promotion as a separate slide**, after the progress/feedback screen. Free users can close it immediately; no auto-checkout, sound, forced waiting or blocked course access.
5. **Day 14 after the completed lesson:** prominent offer to repeat **the exact original confirmed battery**, not recommended or newly substituted tests. Each test is opened using the normal authenticated My Tests runner. Returning after a run refreshes the same day-14 comparison area with saved completion status.
6. Only after comparable follow-up results exist: display original/final figures side by side for truly compatible dimensions; link to each original and final report. Never infer clinical recovery or claim course causation. If a test has changed version, original and newer results are not auto-compared.
7. Starting another 14-day cycle cannot immediately grant a new lesson on the same local day as the former cycle's final lesson; API requires a saved day-14 session and a strictly later local calendar day.

## Data contracts

- No new client test table or replacement of scoring keys; reuse private `growth_courses.test_keys`, `growth_cycles.created_at`, `growth_sessions.completed_at` and `app.assessment_results`.
- Day-14 test list and results are produced only from the authenticated, account-scoped daily course read.
- Exact-version/same scoring and matching dimension range/direction are mandatory for score comparison.
- Result at or before the cycle start = original. Result at or after the saved final lesson = follow-up. Interim tests do **not** count as course-end tests.
- Recommendations on retest spacing from the verified catalog are disclosed. Longer intervals remain advisory; original tests may be repeated voluntarily if available and approved. Do not invent a clinical diagnosis, guaranteed skill score or professional test norms.
- End-of-course analysis never overwrites the baseline or rewrites earlier test reports.

## Subscription offer and naming

Current approved commercial plan is **Advanced**, €20 per month, five parallel active courses and no promotional blocks; the promo headline may say `Pro features`, but never invent a new Pro SKU. Free remains one course; Start at €10 also removes ads; Premium at €100 adds available tests and a personal session benefit (separate scheduling). Paid billing is being integrated in a different PR and is not production-enabled by this feature.

- Only show a new post-lesson advertisement to accounts that are **not** verified ad-free. Use the account-bound authenticated billing status when available. A transient entitlement-read failure hides promotions rather than misrepresenting paid users.
- In the current free-only release, display the offer but state checkout is not active. Show an actual account subscription link only when production-paid checkout for Advanced is enabled. Never imply that viewing a slide creates a subscription.
- This is separate from app/platform ads; it is a first-party Holistic House promotional card.
- Respect the saved completion and optional skip. Do not incentivize more symptoms, test retakes or scores via XP.

## Acceptance gates

- Day 1 or day 13 cannot see or enter a day-14 retest.
- Day 14 without saved final session cannot retest from the course offer.
- Original exact five/saved chosen tests, same version, same owner and cycle; past cycle records remain unchanged.
- First follow-up result appears only after lesson #14 and is shown after return from the existing My Tests runner.
- A 0 value and missing result remain distinct; incompatible versions cannot be merged.
- A second new lesson/next cycle on day 14 is refused on the server even with parallel tabs/replayed requests.
- Paid Start/Advanced/Premium users see no promotional slide when paid entitlement verified; unavailable billing never generates fake payment links.
- Bilingual EN/RU, narrow mobile, keyboard screen reader, privacy and auth isolation; no new migration.
- CI on the exact PR head, merge check, Vercel production SHA and real browser validation before claiming live.
