# Holistic House / Ali — Three chat journeys and seven-session goal program

2026-11-23. Owner-approved product direction. This document is a specification; a merged PR is not proof of LIVE functionality.

## One chat, three distinct service intents

The public first-turn conversation has three equally visible entries, each selectable again during the session. The assistant must not force one entry into the others. Its inference provider (native rules, optional device, Gemini) is a separate concern from the type of help. The existing safety, consent, privacy, voice, signed choices and human-service workflows remain authoritative.

The exact Russian choices are **«Поговорить и снять напряжение»**, **«Понять, что происходит»**, and **«Найти и достичь цель»**. An unclear first message asks which of these needs matters now. Answer, video, meditation and practice are resource formats, not the three entry categories. Offer a resource format only in its appropriate conversation context or after an explicit request.

### A. «Поговорить и снять напряжение» — supportive conversation

Purpose: listen slowly and empathetically without assigning tasks, diagnosing, collecting a long intake, or up-selling. Start with an inviting, open question. Reflect only feelings actually expressed. Permit silence, pauses, no questions, no advice, and exit. An AI conversation is not psychotherapy delivered by a licensed clinician.

After a voluntary request, optionally offer one or two published, appropriate resource practices or guided meditations, or a human specialist. Never present a practice or paid offer just because sadness, shame, loneliness or fatigue was mentioned. If the client asks for no advice, stop offers until the client explicitly requests them again. Do not promise treatment, trauma resolution or guaranteed relief.

### B. «Понять, что происходит» — consultation and diagnostic orientation

Purpose: clarify one problem without turning the first turn into a full questionnaire. Separate confirmed facts, user interpretation, desires, and resources. Offer a real choice: keep talking, select a test from the published library, begin a free situation review, speak with an AI coach or seek a human specialist. No test diagnosis, no invented results, no automatic booking.

The optional Stage 0 self-knowledge toolkit remains separate: balance wheel, eight meaning axes, express situation analysis, Wu Xing. Reuse owner-approved results when access is permitted; never ask for all the values again when already stored.

### C. «Найти и достичь цель» — coaching and goal journey

Purpose: acknowledge a real goal immediately, identify the bottleneck and select any of the seven user directions; do not force stage one when the user wants a plan, resources, obstacles or alternatives. Distinguish a proposed stage from verified completion.

For a new goal request, including «Деньги», «Дай денег» and «Хочу увеличить доход», immediately show the support program and ask **«Что сейчас важнее для достижения цели?»**. Render seven real selectable buttons in this order:

1. Понять, что происходит, и выбрать цель
2. Прояснить и подкачать цель
3. Укрепить свой ресурс
4. Найти путь к цели
5. Снять внутренние ступоры
6. Найти новые возможности
7. Ускорить движение к цели

End the menu with **«Можем начать с 1 пункта.»** Clicking a button or typing its number selects that step. «Да» and «Давай» immediately after this invitation select step one. Retain the financial topic and selected step in subsequent answers. A short answer such as «Доход» must not restart the menu. Money mentioned while explicitly seeking support or understanding stays in that selected path; it is not automatically a goal request. Restore only shareable conversation evidence, honor no-advice/no-questions preferences, and reset stage navigation on an explicit topic or intent change.

Offer three formats without claiming a checkout exists: seven AI-coaching meetings; seven meetings with a human specialist (subject to actual published availability); or seven mixed meetings (distribution agreed with client). Consent to a format does not grant permission for payment, saving, booking or sharing data.

## Seven meetings; outputs and tools

| Meeting | Purpose | Potential instruments | Evidence required from client |
|---|---|---|---|
| 1 | Find a personally meaningful direction | Express interview, balance wheel, values | Client's tentative goal and current point |
| 2 | Clarify the objective and motivation | Goal criteria, sense axes, desired future | Confirmed wording, why and success signal |
| 3 | Locate strength and support | Resource map, past successes, resource practices | Named available resources and a constraint |
| 4 | Create a realistic roadmap | GROW, 90/30/7/1, minimum/normal/stretch | Client-owned small action and optional time |
| 5 | Explore obstacles without pressure | WOOP, facts vs predictions, gentle experiment | Client-named obstacle and safe response |
| 6 | Explore new possibilities | Alternatives, reversible experiments, specialist insight | Two plausible options or honest uncertainty |
| 7 | Sustain action and revise | Daybook review, actual before/after, next cycle | Client-verified progress and freely chosen next step |

Stage 0 self-knowledge is not a compulsory meeting. The pre-existing eight-session transformational course is a different guided experience, and must not be overwritten or silently renamed to seven.

## Conversation algorithm

After safety preflight, read the chosen path and most recent user action. First address any direct question, complaint, refusal, correction, request for an existing service, or topic change. Only then use the selected path to pick a response style, a potential coaching step and at most one question. A response should clarify, reflect, provide a grounded new perspective or offer one appropriate optional action. Do not loop the same question. After several answers with no new evidence, summarize what is confirmed and offer a choice or pause; do not manufacture progress.

The path selection is not a clinical classification. Local opening messages are assistant speech and must never be inserted as fabricated user input. A button label can be recorded as a user turn only after the user actually selects that button; it follows the existing consent-aware history persistence. Privacy-sensitive psychologist pre-interviews, consent-gated Gemini, personal records, Daybook writes, and published services keep their own server-owned authorization. Recommendations open actual source pages; no phantom booking or CRM submission.

## Integration and release

Implemented in a scoped source branch: a pure three-journeys helper, the existing AI Messenger first-screen selector, guest native reply path and signed-in rules API. Available public routes referenced for optional resources: /practice, /meditations, /tests, /holistic-support, /my-coach, /coaching/sessions. The seven-meeting program is not yet a published sellable package; these are resource discovery links.

Further work: retain selected paths reliably across authenticated devices and the separately consented Gemini Live/My Coach pipelines, add client-approved stage progress and program management, human/AI/mixed session assignment, published prices, actual booking and human handoff. None of these follow automatically from this minimal code change.

Test RU/EN/ES, no-advice, direct price/booking questions, two non-answers, fear vs planning route, multiple goals, unsupported voices, real iPhone Safari, explicit client memory consent and completion evidence. Protected exact-head checks and an independently confirmed READY production alias are required before any LIVE claim. Avoid extra Vercel builds, paid inference and unapproved services.
