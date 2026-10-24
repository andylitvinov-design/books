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
