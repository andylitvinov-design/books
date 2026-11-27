# My Coach program comparison · owner-approved 26 Nov 2026

Reference: approved English mobile mock in Couching conversation (928 × 1648 rendered image; physical DPR and browser crop unknown). Target is the new public comparison view, not the existing individual program detail or private Daybook. Existing entry was the inline list from PR #5735. New canonical target: /{en,ru,es}/my-coach/programs. Guest or signed-in public view; no pixel comparison across different view states. Production branch codex/public-book-library; pre-change source a429acca4e8710f28968532c68935abed939d19d. Live at preflight was READY f91aa1e12d0b613bbe6158478011da0bf0968cdf.

## Visual mapping (relative to reference width; estimates)
Header y 5–10%, title and back y 11–17%, free expanded card y 19–60%, three compact horizontal paid rows y 62–88%, existing unified dock at bottom. Implemented with 12–14px phone gutters, serif titles, ivory and gold borders, original first-party art, a gold full-width start and green selected dock. Compact paid rows with art / copy / count and price / disclosure icon; free rows with three session illustrations. Content scrolls, never clipped to force the exact first fold; translations may wrap.

## Interaction
- Main My Coach / Course options & details → real dedicated localized comparison page.
- Native details/summary opens or closes each card; Free expanded by default. No auto-open modal.
- Start Free Program reuses ClarityStartLink, its verified bootstrap and existing OAuth continuation; no quota bypass, session completion, account creation or payment simulated.
- Clarity titles follow the current three-day syllabus, not fictional replacement sessions. Business uses the existing eight-session business syllabus. Love and Health have explicitly provisional eight-topic outlines.
- Owner requested €19.90 per paid program; enrollment is not open, no checkout or entitlement implied. No crossed-out €10 prior sale price until evidence establishes it. No changes to program launch screen or paid backend.
- Existing global dock with Coach active, existing iHelp and locale switching retained.
- QA: source assertions and optional browser script scripts/verify-my-coach-programs-mobile.mjs use existing isolated infrastructure. Actual browser/overlay/live/private end-to-end evidence pending. No new workflow, provider or release channel.

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES.
