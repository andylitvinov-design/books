# Author Coaching Questionnaire · Holistic House
**Source:** author's Google Form “Архетипическая диагностика и поддержка”  
**Source URL:** https://docs.google.com/forms/d/e/1FAIpQLSeqk1zGYGxiOYOh9bwRCPN-6blFfeOFFv7bp8za4VeoVHaIrw/viewform  
**Issue:** https://github.com/andylitvinov-design/books/issues/1709  
**Model version:** \`hh-author-coaching-intake-v1-20261023\`  
**Date:** 2026-10-23

## Scope

Dedicated one-page questionnaire at \`/{en|ru|es}/coaching\`, reached via Personal Services and the separate free Situation Review information page. It does not replace the existing **free handwritten ME–GOAL–PROBLEM** assessment (which is still copy/send) or 90-Day Business Coaching. This is a structured self-reflection, not a clinical assessment, scored test, booking, payment, or verified lead.

Four sections in the author's original progression:

1. **Starting point** — topic, main request, present occupation/concern, optional self-chosen name and location.
2. **Present reality** — previous approaches and results, difficulty, actual progress.
3. **Desired outcome and resources** — ideal result, why it matters, available capacities and helpers.
4. **Session questions** — useful work outcome, measurable evidence, one priority question, up to eight additional questions, optional background.

Sections are visible on one page rather than requiring separate navigation. Text is entered by the client and can be explicitly copied or downloaded. Three answers are required to mark a session questionnaire complete; optional fields remain optional. Progress indicates **answered fields out of 20**, not psychological percentage or clinical scoring. No AI or speech service runs.

## Privacy and persistence

- Anonymous visitor may fill and copy/export. No guest answer persistence on backend. No analytics or messaging includes private fields.
- Only an explicit Google OAuth login + checked owner consent + Save triggers persistence. An explicitly signed-in save uses \`/api/app/coaching-intake\`; verified Google user, session/account active, same-origin, per-account header, rate limit, and optimistic revision are enforced server-side.
- \`app_private.coaching_intakes\` holds only per-account AES-256-GCM sealed JSON, pinned to \`COACHING_INTAKE_VERSION\`, with four owner-only RLS policies for \`hh_app_backend\` and no \`anon\`/\`authenticated\` grants. Server encryption AAD binds actor/record/field.
- One v1 questionnaire per account (updatable); explicit deletion. No silent sharing to practitioner, CRM, social apps, pixels, analytics, Telegram/WhatsApp, or external transcription.
- A 15-minute \`sessionStorage\` draft is **only** created on deliberate OAuth sign-in to retain text through the redirect; consumed and cleared immediately on load. If a saved questionnaire exists, user chooses whether to load it or keep local draft; no automatic overwrite.
- Login is optional for guest copying. “Complete” is local owner status only, not a request/booking/submission.

## Non-goals / future integrations

Consent-based coach sharing, secure client-messenger relay, verified CRM enquiry receipt, appointment confirmation, audio dictation/TTS and self-selected coaching frameworks are separate issues. This release deliberately creates no automatic practitioner access, advertisements, billing, scheduled follow-ups or delivery events. It does not copy old payment/bank details or guarantee language from the original form.

## Verification gates

- [x] Author's question sequence translated to EN/RU/ES and version pinned.
- [x] Private API and RLS migration authored with bounded input and no cross-user grants.
- [x] One page, text questions, custom questions, copy/export, delete, optimistic-revision conflict UX and 320–430px responsive source styles.
- [ ] Targeted Node tests, ESLint/typecheck/Next production build, GitHub CI.
- [ ] Apply migration to the **verified ca-central-1 Holistic House Supabase**; read back table, RLS/policies/grants, run security advisor and negative access checks.
- [ ] PR review, merge into actual Vercel production branch \`codex/public-book-library\`, verify READY with exact SHA and \`holistichouse.vercel.app\` alias.
- [ ] Authenticated Google → save → refresh → restore → delete + guest copy/export on real device at 320/390/430px. Browser/source-only checks cannot close this gate.

**No milestone is marked live just because a commit, mock, or build exists.** Any failures or unverified integration must stay explicitly open.


## UX revision · 2026-10-23 · one question per item

Owner feedback: an item must never combine multiple questions. Earlier compound prompts were split into **20 individually numbered questions** with one input apiece and one question mark per EN/RU/ES label. Six additive IDs (concernDuration, attemptsResult, currentResults, expectedChange, existingSupport, helpers) capture distinct answers; existing 14 IDs are preserved verbatim for backward compatibility. Existing sealed v1 draft data and the stored version discriminator remain readable, with new fields initially empty. Never guess, split or erase earlier user text. **No SQL migration, RLS revision, new private service or data-copy job is required.**

Page now uses a slim first-party scenic hero, a compact progress chip, small personal detail fields, four lightweight section headers, and **one numbered row per question**, not two different questions under one large label. Desktop has one question label paired with one answer box per row; iPhone 320–430px stacks the same single item with generous touch target and a focus-expanding answer. User-defined follow-up questions remain individually editable and removable. All save/restore/delete/Google-auth/consent mechanisms remain unchanged.

Acceptance:
- [ ] Node test tests/coaching-intake-form.test.mjs on the exact PR head checks all 20 original atomic EN/RU/ES labels, stable prior IDs, 3 required answers, HTML label/textarea linkage, mobile breakpoint/focus design, and private-storage contract.
- [ ] CI + Next.js build, ready production deployment exact SHA.
- [ ] Guest page on EN/RU/ES checked for individual question numbering, no missing fields and mobile overflow.
- [ ] Live signed-in save/reload/delete + legacy completed questionnaire remains a distinct E2E verification gate. No automatic CRM/messenger handoff is claimed.
