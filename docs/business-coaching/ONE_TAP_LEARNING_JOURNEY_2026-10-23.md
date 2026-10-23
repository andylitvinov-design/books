# Business & Career 90 Days — one-tap learning journey v1
2026-10-23 · owner-driven redesign · applies to existing private course in `/en/app/business` and `/ru/app/business`.

## Change and rationale
The former first practice demanded "Write down three observable facts", the five-step slide flow demanded a typed result (>5 characters), and onboarding required a written 90-day goal. These are cognitively expensive on a phone. The reviewed replacement uses **closed choices only** in the primary learner path; no client must type a journal response to proceed.

- New enrolment: select **idea/owner/career** → one of four suitable **90-day goal** choices → deliberately consent to private storage.
- Each of the **90 days** includes a *single small authored EN/RU micro-action*, a brief skill/idea, and **four direct answer buttons**: tried, small step, not yet, not relevant. Progress counts the **answered learning check**, not completed customer outreach, dollars earned or objectively demonstrated skill.
- Screen flow: **Today’s idea → Choose one answer → Saved** (actual private save must succeed before the celebration/next lesson appears). Existing Reiki-inspired photo, safe-area CTA, course map, pause/resume remain.
- Weekly review: four closed answer buttons, with previously saved written reviews retained and visible.
- Optional 18-item Business Snapshot remains a separate (already closed-select) original, **non-validated** self-observation. Real customer/revenue indicators remain only in separate voluntary **Indicators**, with exact value, period and provenance; never infer from one-tap check-ins.
- EN/RU authored content for 90 days; ES is not claimed to be editorially reviewed. No new external services or client messages.

## Existing history and data contract
- Keep the same `app_private.business_coaching_programs` owner-scoped sealed record, revision checks, activity date, original `done`, original `note`, `result` and `reflectionChoice`, old snapshots, surveys, business KPIs, exports and RLS. No migration.
- Add `choiceId` and `choiceVersion=hh-business-one-tap-v1` to each newly answered day inside that encrypted document.
- Server allowlists `choiceId`; canonical text is created server-side and is explicitly described as **self-report**, never a verified external outcome.
- New UI can display historical custom goals and journal records; on editing a goal, user opts in to the new choices. No duplicate table or automatic rewrite.
- Legacy browser clients can continue to submit previous authenticated course payload; do not remove the existing compatible result-validation rule.

## QA and release gates
- [ ] 90 EN and 90 RU nonempty, distinct day micro-actions; 3 tracks × 4 goals; 4 response buttons; unknown choices rejected.
- [ ] Focused tests: course structure, locale, server validation, RLS/encryption contract, missing-data scoring, legacy notes, review updates.
- [ ] New enrolment → select goal → consent → day 1 question → save → confirmation → day 2; reload → resumed answer. Simulate API rejection and concurrent revision conflict: no false success. Existing completed day remains completed and its original note remains readable.
- [ ] Logged-in iPhone Safari 320/390/430: no text entry, 4 tap targets without clipped labels, sticky Continue, no horizontal overflow, screen reader labels and keyboard controls. Check dark/reduced-motion modes.
- [ ] Tests/CI and build pass; production branch, exact SHA, Vercel READY and `holistichouse.vercel.app` alias verified. If private OAuth/E2E is unavailable, mark it unverified even if static and deployment checks pass.

## Non-goals
No payment, CRM, notifications, clinical/homeopathic recommendations, test score fabrication, income guarantees or rendered video. No tracking of private answer payloads in analytics.
