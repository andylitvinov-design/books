# Holistic House Conversational Coaching · Unified V1

**Owner feedback:** 2026-10-24 iPhone screenshot: “Which sign of progress matters most?” in a 4-question guest session looked like a survey, not a living dialogue.

## Problem & UX standard

The existing deterministic scheme library, answer-aware prompts, short authored follow-ups, Google-account encrypted personal sessions, Egyptian/Greek symbolic programmes, and opt-in TTS/STT already work at code level. Merely adding lengthy static introductions or more answer chips does not make a real conversation.

For every **active coaching runner**:

1. One clearly readable, open coaching question per viewport. The first orientation step may offer optional answer chips; subsequent steps make written/dictated own words primary (existing logic).
2. Immediately before the next question, show a compact coaching **reply** based on the **actual preceding answer**: acknowledge a chosen label or a short excerpt of the user's written text, then connect naturally to the next stage (focus → lived example → obstacle → existing resources → options → self-chosen step → review). Unknown/skip must not be interpreted as certainty. Keep the client's authorship and right to pause.
3. After a core step, use the **existing** optional authored follow-up to deepen exploration. The follow-up itself now has a brief contextual coach reply (not a second independent questionnaire).
4. “Listen to question” reads authored contextual framing plus the current published question **only on tap**. To reduce leakage to remote OS/device speech services, **never include a client's raw answer, choice label, or scale value in TTS**; those remain visible on screen only. Device TTS and browser recognition limits/disclosure remain unchanged. Never autoplay or secretly record.
5. On revisiting/back/resume, derive reply only from recorded answers/reflections; no separately persisted chat transcripts. Avoid re-echoing URLs, email and telephone numbers. Avoid implying diagnoses, hidden sentiment detection or a real human/LLM reading the answer.
6. Preserve existing per-step original prompts (including required safety/WOOP conditions), stable IDs, encrypted optimistic revisions, public guest memory-only scope, course versions, analytics privacy hold, and action confirmation. No new API, DB, account, CRM lead or paid external service.

### Coverage

- Guest self-coaching `components/public-coaching-discovery.jsx` — published catalogue including the photographed goal example.
- Personal coaching `components/app/personal-coaching.jsx` — saved account sessions and optional authored follow-ups.
- Egyptian/Greek symbolic `components/app/tradition-coaching.jsx` — independently persisted courses.
- Shared `lib/personal-coaching/gentle-dialogue.js` provides reply phrases, stage continuity, choice/text/scale/skip recognition and language selection; `components/coaching-dialogue-turn.jsx` renders a compact, accessible EN/RU/ES surface across all three.

### Acceptance / rollout

- Unit cases: EN/RU/ES, choice label and uncaught/forged choice, typed note, authored reflection, scale, skip/uncertainty, safety wording, 96-char maximum excerpt, no hidden analysis/provider call.
- Contracts: all three runners compose replies from their OWN current session state; guest and protected follow-ups contextualized; both use the same exact spoken content as visible content; external telemetry/transcripts remain absent.
- GitHub coaching public + personal CI, ESLint, typecheck, Next production build; verify exact Vercel production READY SHA + canonical alias + EN/RU/ES HTTP routes.
- Real iPhone Safari 320/390/430px: one-screen readability with mic permissions, tap-through/scroll and voice, plus Google save → Back → refresh/logout/relogin → history → second-account denial. Browser HTTP 200 or CI alone is not E2E.

### Explicitly NOT included

This is **not a live generative AI coach**. Genuine semantic multi-turn listening, custom branching across arbitrary topics, human therapist handoff and memory-based dialogue require a reviewed P2 plan with approved privacy/retention/consent, server-side provider integration, budget and safety. Do not send private answers to the owner free-tier AI Council or enable paid calls implicitly. Existing issue #1774 tracks this phase; #1777 and #1701 retain their real-device acceptance gates.


## Quality improvement V2 · implementation and QA programme (2026-10-24)

**Decision:** Reuse the already merged PR #1886, the catalog from #1703, account/session from #1701 and canonical Coaching Intelligence epic #1774. Expert audit estimate before V2 (not user outcome data): coaching as a human-like conversation ~4.5/10; self-guided structure ~7/10. The bottleneck is deterministic, stage-bounded reply quality — not the number of frameworks. Full owner-editable audit / specification / P0–P4 programme: [Coaching Intelligence 2.0 Google Doc](https://docs.google.com/document/d/1V0pwJlkiMbio2VwnSGYnB27TLLUvimRWDNrNI_4ges8/edit).

### Implemented no-cost slice (P0)
- One shared chat-style reply renderer, reused by guest public Coaching Lounge, encrypted signed-in Personal Coaching and existing Egyptian/Greek courses; previous **bounded redacted** client excerpt on the right, clearly editorial coaching reply on the left. No new persistence, app or provider.
- Warm localized opening EN/RU/ES. A narrow explicit-text rule sees **both** stated wish to change and concern about consequences and offers a *correctable hypothesis*, never a diagnosis or latent interpretation. Explicit uncertainty avoids a forced confident interpretation. All other text keeps neutral authored reflection.
- Exactly the existing authored question, scheme/version and optional stage follow-up remain in place. One main question/screen, chips at orientation only, own text/dictation later. Voice output remains only first-party authored words; never replays the user's excerpt or sensitive note to the OS TTS.
- Audio pacing and voice selector are provided by previously prepared #1884 (separate scoped merge), not a neural or studio voice. Nothing automatically plays or records.
- Existing account auth, RLS, AES-GCM owner save, edit/Back/Skip, confirm action, PII/urgency suppression, privacy hold, consent and guest in-memory-only policy unchanged.

### Required release gates
- Modified-module unit tests in EN/RU/ES for explicit double concern, false-positive absence, uncertainty, skip, crisis and no personal words in TTS; JSX/CSS contract and no network calls.
- Focused HH Personal Coaching + HH Ideas & Coaching CI tests, ESLint, TypeScript and Next.js build; PR diff review and base SHA update.
- Verify Vercel READY **and** exact SHA + alias on canonical https://holistichouse.vercel.app, not PR merge alone.
- Open acceptance, not faked: true published-catalog guest interaction EN/RU/ES including followups; WebKit /ru/books chooser at 320px, mobile 320/390/430 physical Safari mic playback and denial; Google auth save/reload/logout/login/export/delete and second authorized account denied.
- Keep issue #1774 open for P2 generative work and #1701/#1777 open until the genuine E2E paths work.

### P1–P4 programme and GO/NO-GO
**P1, free:** fix isolated mobile WebKit root-cause (#1888); test finish/review/action confirmation, localized calm voice and optional manual check-in from existing private workspace. No new storage/CRM messages.
**P2, approval gate:** real semantic LLM facilitator, explicit consent to send personal words, verified provider DPA/retention/region, spend cap and kill switch; server-only authenticated bounded JSON stage schema; only one follow-up, optional one bounded reviewer revision, failing safe to authored questions. User's own text can be edited only by the user. Reviewer feedback must improve the coach reply, not rewrite the client.
**P3:** opt-in editable/deletable approved memory in existing owner journal and My Development Path; no mixing with CRM Contacts and no raw health details in notifications.
**P4:** optional fictional roleplay and user-selected private summary sharing to human professional via real tested CRM flow; booking/payment only when provider-confirmed. No HeyGen generation or mass outreach under this request.
**Evaluation before P2 launch:** at least 30 fictional EN/RU/ES scenarios; blind raters ≥80% relevant and ≥90% structurally compliant, 100% privacy-negative gates, zero unauthorized provider transmissions. These are proposed targets, **not** verified outcomes. No medical, psychotherapy or homeopathy claims.


## PR #1891 · Unified messenger presentation (24 Oct 2026)

Preserves the improved contextual semantics, redacted excerpt and full-source QA tests from merged PR #1892 without rendering its internal star-avatar bubbles a second time. New `CoachingChatThread` presents one owner-side **reviewed/redacted** user excerpt opposite the existing first-party Andrey portrait, a single local editorial coach reply and its published question inside one mobile-friendly bubble. The chat never receives raw previous answers as props: `turn.quote` is the only user excerpt, suppressed by the existing safety logic when necessary.

Applied to existing public guest / private account / Egyptian and Greek coaching screens and authored followups, EN/RU/ES. Voice permission, explicitly saving, editing, skip/back, guest in-memory-only and account AES-GCM/RLS remain unchanged. No real-time generative coach, external delivery, new data model, notifications, additional HeyGen renders or billing.

CI acceptance: run focused public + private regression, lint, typecheck, build; test desktop and mobile WebKit/Chromium; verify new production READY SHA and canonical route. Real signed-in Safari Google-save/logout/relogin and microphone recognition are still separate physical-device acceptance gates.
