# Ali · Guided Intake for existing consented Telegram V3

Owner reference: 17 November 2026, four screenshots of a real new-client dialogue about difficult life events, a photo scan, the client's desired outcome, obstacles, present circumstances and an express review.

## Scope
- **One assistant, one existing signed webhook, no new provider, database, cron, bot, project or paid build.**
- Only the already consented **standard Secretary diagnostic interview** is changed. General chat and separately opted-in **Secretary Psychologist** retain their existing role routing, consent, depth limits and handling. Human personal Telegram Business `@holistichouse` and WhatsApp are not made active by this PR.
- After the existing consent step the standard Secretary follows **goal → challenge → current situation → optional additional details → client-reviewable summary → explicitly confirmed CRM handoff**.
- A complete three-part answer advances directly to review; an already shared present-day circumstance is not asked for again. No assumption that an account of distress states a goal.
- Examples of photo/energy/psychic queries receive candid, brief role/limitation explanations before the next single question. A person's appearance cannot reliably determine health, personal energy, hidden causes or life outcomes; do **not** promise photo-scan readings.
- Optional “Me — Goal — Obstacle” drawing only through a practitioner-agreed **secure channel**, not requested in the Telegram bot's unsupported photo intake. No inference from images.
- Final summary contains only the customer's words and remains a **draft** until the existing `review_confirm → send` explicit approval; no claim that booking, payment, diagnosis or report was completed.

## Implementation
- Pure decision planner: `lib/assist/ali-guided-intake.mjs`, RU/EN/ES, no requests to any model or account system.
- Existing encrypted V3 context now allowlists `intakeStage` and small `intakeSlots`; no migration and no public profile of sensitive client facts.
- Signed V3 handler uses the local planner **only** after consent, provider/urgent safety checks, rate limits and STOP; hard fail-close for unavailable processing. The existing post-commit encrypted write and separate review-confirmed CRM handoff are retained.
- As soon as all three facts have been supplied, the existing **Finish interview** button appears even if they came in one message.

## Acceptance
1. “My happening life” or “Sorry, it's my first time” is not turned into an invented goal; the client sees one useful question.
2. “Lots of negative events” is acknowledged and recorded as current situation in encrypted context, never misclassified as a specific aim.
3. “Are you a therapist/psychic?”, “Check my energy” and “What information do you need?” receive precise, non-misleading replies and one next question.
4. The client supplies goal, obstacle, situation separately or in one message: no repeated fields, `ready` with visible Finish action.
5. “Not sure”, “no more questions”, explicit stop, danger signals and already-provided details are handled without diagnosis, coercion or automatic sale.
6. Human review is offered only after a client-visible summary. CRM submission still requires independent, existing **Send request** action. A STOP/revoked consent produces no ongoing provider processing.
7. Existing V3 tests, targeted `tests/ali-guided-intake.test.mjs`, TypeScript/build, webhook auth/consent/CRM checks and protected exact-HEAD CI must pass. Real end-to-end Telegram acceptance still needed.

## Release and budget
The protected project branch is `codex/public-book-library`. Merge only when required exact-head checks pass and no conflicting active PR update is lost. Use the **existing** hourly production publisher and verify the canonical `holistichouse.vercel.app` alias/served deployment SHA; do not manually create paid previews/deployments. Separately verify official Telegram Business rights and owner setting before claiming `@holistichouse` auto-replies. WhatsApp Meta onboarding is a separate unmet prerequisite.
