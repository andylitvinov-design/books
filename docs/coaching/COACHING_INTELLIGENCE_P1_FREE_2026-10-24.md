# Holistic House Coaching Intelligence · P1 (no paid AI)

**Issue:** [#1774](https://github.com/andylitvinov-design/books/issues/1774)  
**Scope:** first free implementation; not the future LLM/voice/video agent.  
**Baseline:** existing #1701 session API and #1703 catalog, current actual production branch `codex/public-book-library`.

## What this PR adds
1. **Answer-aware editorial coaching prompts.** Client's last three completed saved responses are examined locally. Where there is an explicit signal (lack of time, uncertainty, hesitation, stuck, available support/resources, or a self-rated scale), a reviewed, localized question can replace the current original wording **without changing the model, stage, question ID, answer choices, server validation, or recorded answer**. One question per screen stays intact. A button always restores original model wording; tailored reading voice uses precisely the visible question. Unknown, skipped or ambiguous answers keep the original prompt. WOOP's mandatory final if–then plan and scale questions are not rewritten.
2. **Evidence-only recap.** Previously the summary displayed the *last* answer as “The step I chose”, incorrectly calling a final review rating an action. P1 derives focus, situation, resources, possible next step and optional timing from semantically labelled steps **actually saved**, with no ungrounded claims. Missing fields are omitted. Existing answers/history are unchanged. The copy button uses an explicit clipboard gesture — **nothing** is sent to a practitioner or CRM.
3. **EN/RU/ES first-party interface** with compact responsive cards and iOS-safe scroll. Spanish route prefix remains `/es/app` rather than falling back to EN.
4. **Regression suite** `tests/coaching-intelligence-p1.test.mjs` wired into `npm run test:coaching:release` (also prebuild). It covers relevant/skipped/unmatched/rating/WOOP/review replies, all three languages, CSS selectors and parseable JSX.

## Technical boundaries / privacy
- No LLM, paid vendor, HeyGen avatar, cloud STT, customer outreach, background work, advertising or payment.
- No new database tables, migrations or permission grants: existing `personal-coaching` signed-in owner-scoped encrypted save/resume API is the sole persistent source. P1 calculation runs in browser memory and doesn't fetch/record the user's raw answer separately.
- The editorial prompt is a **rule-based adaptation**, not a live AI coach or diagnosis; labels must not misrepresent it.
- No user answer is shared, logged as analytics or converted to a lead. Clipboard only on user tap.
- Question IDs and saved values remain identical to existing versioned catalog; all legacy sessions continue to open. The current prompt may be tailored during the session, but archived result is categorized under its original published model step.

## Acceptance gates
1. `node --test tests/coaching-intelligence-p1.test.mjs`
2. `npm run test:coaching:release`, lint/typecheck and Next build; CI run **completed** (not merely queued).
3. Verify PR diff is limited to P1 files; safely merge to actual production branch only after green gates.
4. Vercel production **READY**, branch and exact SHA both match alias `holistichouse.vercel.app`.
5. Real Google signed-in iPhone Safari (320–430px) checks: open `/[locale]/app/coaching`, choose a model, answer a barrier, see contextual question, toggle original, listen, skip, save, reload/relogin, finish, check action recap, copy manually, no silent share. Repeat EN/RU/ES; test second-account isolation.
6. If signed-in browser E2E is not possible, do **not** mark fully done; leave #1774/#1701/#1703 caveat until performed.

## Future P2 requires separate approval
Server-side orchestrated generative follow-ups, long-term opt-in memory, real-time voice, personalized roleplay, external CRM messaging, LLM costs and any remote processing of private answers are **not** part of this zero-cost phase.
