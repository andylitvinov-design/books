# Holistic House · My Course — daily before/after measurements (v1)

Date: 2026-10-13. Applies to the existing owner-scoped 14-day skill course. No new assessment battery, database, scoring key or clinical inference.

## User journey (one meaning per slide)

1. **Before practice** (0–10) — the client's perceived **current difficulty with today's named practice focus**. Explicit anchors: 0 = not difficult, 10 = very difficult. Optional to avoid coercing private health disclosure.
2. Optional separate **24-hour problem check-in** — retained as a different question and different dataset; never treat a 24-hour severity score as an immediate pre-practice score.
3. One micro-idea / optional recall / working phrase / guided activity / small action / reflection per slide, as already approved.
4. **After practice** (0–10) — same focus, same scale, same time reference (right now), same anchors. Score 0 must not be confused with missing.
5. Honest voluntary feedback, secure server-confirmed lesson save.
6. **Completion screen** — exactly two large values (before → after), descriptive change in points, no promise of improvement or claim of causality. If either value was skipped, show no computed comparison. Completion/XP remains tied only to server-confirmed participation.

## Next-day Today page

A compact turquoise two-line graph appears under the daily hero. Users can switch between their confirmed practice scales using small pills; observations are grouped by the original **stable scale ID**, not merely a shared text label/goal. For each selected focus, show daily pre-practice and post-practice dots on a consistent 0–10 axis, with missing days/values missing. A single saved day shows only points, not a manufactured trend. Older course versions remain readable. The established, separate 24-hour check-in trend stays under Details.

## Data contract

- Existing account- and cycle-scoped private `growth_sessions.before_now` and `after_now` are reused. Both fields are nullable integers in 0…10, stored with the authorized session.
- The existing `describeCycle` projection now includes nullable `beforeNow` and `afterNow` for saved sessions, with 0 preserved.
- The read-only roadmap provides `focusScaleId` plus `focusGoal` for each day. The graph never aggregates ratings from different selected scales, course cycles or accounts.
- No local browser storage, external analytics, URL parameters containing ratings, additional DB migration or new third-party processor.
- Real data describes feelings recorded at different moments; it is not a psychometric instrument, clinically validated outcome measure, diagnosis, or proof the lesson caused change. Earlier entries may use older wording and should be read descriptively.

## Acceptance

- First lesson screen allows immediate self-rating; one meaning per screen.
- Same named focus, direction and anchors at both moments.
- Server confirms save before result/XP.
- 0, null, partial and repeated daily observations render honestly.
- Days 1–14 including nonconsecutive repeat of a primary focus and distinct scales with the same name.
- Next-day Today screen, EN/RU language, mobile safe areas, focus and keyboard accessibility.
- Existing 24-hour check-in, 14-day quest, test history, subscriptions, privacy controls and legacy cycles remain intact.

## Release gate

Unit tests, ESLint, Next build and browser acceptance must pass on the feature branch; production use additionally requires merge and verification of the actual production deployment SHA. A PR merge alone is not proof of a live site.
