# Holistic House · Coaching response intelligence v3

**Status:** implementation candidate (11 November 2026), integrated in the existing opt-in Personal Coaching Brain; production approval is separate. This is **in-context coaching guidance and deterministic conversation control**, not a fine-tuned model checkpoint or independently proven clinical effectiveness.

## Why

The previous controller could select a reviewed method, but did not recognize whether a client utterance was an **answer to the immediately preceding question**. A bare “да”, “no” or option “1” could not pass the client/server minimum-three-character rule. Earlier fear or resource cues could override a contradictory recent answer. A model could repeat the last question or invent a commitment from old history.

The goal is a **responsive coach**, not a rigid questionnaire: faithful reflection, a non-leading single question, reversible navigation hints and user autonomy.

## Existing architecture is reused, not duplicated

- Personal coaching dialog, per-turn consent, transient local chat: components/coaching-brain-panel.jsx
- Authenticated private session, rate limits, ZDR/free provider routing: lib/app/coaching-brain.js
- Method/stage controller and safe response validation: lib/personal-coaching/coaching-brain.mjs
- Evidence-led protocol: lib/personal-coaching/coaching-session-protocol.mjs
- **New pure layer:** lib/personal-coaching/coaching-turn-understanding.mjs, consumed by the existing controller/protocol. No storage, provider, cost, transcript, diagnosis, data migration or consent change.

## Coaching micro-skills

1. Recognize the **conversational role** of the current reply: agreement, rejection, uncertainty, hesitation, numbered option, correction, request to rephrase, topic switch, question to coach, emotion, gratitude and substantive information.
2. Interpret a bare yes/no only against the preceding question. Neither a bare answer nor a number is a confirmed action. Do not infer unspecified goals, traits or motives.
3. If corrected, thank the client and **discard the older framing**; if asked a direct question, address it before offering a new coaching question.
4. Ask **one** short, non-leading, useful question focused on the largest missing piece. Avoid generic questionnaires and multiple questions hidden behind one question mark.
5. Route reviewed methods as optional guidance, not as identity labels. Never label the client as resistant. A user-selected method retains priority.
6. Commitment requires a current, positive client-authored action and time. Negated, speculative or scattered historical signals must not imply readiness.
7. Offer localized EN/RU/ES authored fallbacks when AI is offline. Do not pretend to answer with an AI provider.
8. Respect stop/skip without provider access; distinguish “I cannot stop worrying” from “stop this conversation.”

## Synthetic dialogue targets

| Last coach question / Client answer | Better next action | Avoid |
| --- | --- | --- |
| «Хотите решить сегодня?» → «Нет» | «Не будем торопиться. Что было бы полезнее сейчас?» | «Когда вы выполните решение?» |
| «Что вас сдерживает?» → «Не знаю» | «Какую одну часть ситуации проще всего рассмотреть?» | «Почему вы избегаете ответственности?» |
| «Вы боитесь конфликта?» → «Нет, мне не хватает времени» | Принять поправку и спросить о нагрузке | Настаивать на гипотезе страха |
| «Можно выбрать 1 или 2» → «2» | Спросить, что привлекает во втором варианте | Записать выбор в Life Plan автоматически |
| «А ты что предлагаешь?» | Предложить 1–2 осторожных варианта и один вопрос | Возвращаться к началу анкеты |
| «Давай сменим тему» | Пересогласовать цель разговора | Продолжать прежний путь |
| «I will not send it tomorrow» | Не считать действием/обещанием | Отмечать commitment по словам will/tomorrow |

## Evaluation

The existing tests/coaching-brain.test.mjs regression suite has been extended with multilingual response acts, one-character short answers through the form/server, corrections, topic switch, no-action-inference from old quotations, non-repeated model questions, direct question guidance, false-stop checks, and non-inferred commitments. It reuses the pre-existing coaching release command.

For each release, perform human review with **synthetic scenarios only** (unless real transcripts are separately and explicitly consented, de-identified and approved). Score each generated response from 0 to 2 for: reflection fidelity, relevance to latest question, single-question discipline, client autonomy, correction repair, evidence-led progress and fluent EN/RU/ES. Require zero critical safety/privacy errors and at least 90% passing deterministic cases before staged rollout. Track repeated questions and voluntary session usefulness separately; no claim of clinical outcome or model fine-tuning follows from source tests.

Release requires exact-head CI/Core/Coaching checks, reviewed privacy model and pricing, protected merge, Vercel READY at the canonical alias, and a consenting authenticated multi-turn smoke with separate confirmed-step save/reload and ownership checks.

## Constraints

No stored transcript, personal medical history, previous coaching session, private report, Life Plan or hidden client context goes to an AI provider automatically. Any actual model-weight training would require a separate explicit data/privacy approval process. This version improves runtime reasoning, prompt examples and guarded controller behavior; it does not retrain weights.
