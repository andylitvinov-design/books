# Wave · Friend Mind 2.0 — conversational quality and acceptance

**Scope:** one additional non-clinical conversation style in the existing Holistic House Wave/Al(i) web chat. The existing support quiz `talk` path becomes an explicit Friend Mind; not a second generative model, new CRM pipeline, therapist, paid API, memory store or notification job.

## Interaction contract

- Three voluntary **session-only** tones: `friendly` (default), `confiding`, `tender` (gentle romance, no graphic sexual simulation). Never infer consent for romance from sadness, loneliness, or the subject of relationships. Boundaries such as “без флирта” override even `tender` immediately.
- Warm RU/EN/ES replies about everyday life, happiness, loneliness, vulnerability, relationships and closeness. No manufactured biography, emotions or romantic reciprocity; no claims that the AI is a human partner or the user's only support. No sales funnel, diagnoses, obligatory questionnaire or unsolicited therapy.
- At most **one** optional question per turn; respect “без советов”, “без вопросов”, refusals, correction, STOP, topic reset. Use only a bounded, ephemeral set of *user-authored* prior turns for topic continuity; assistant text is not evidence. Rotate phrasing to reduce verbatim repetition.
- Safety, authentication, rate limits, signed session/choice state, payment and booking remain owned by the existing API. A friend reply is **never** generated before safety verification. Requests for bookings, payment, medical advice, video generation, or urgent risk return to their established routes.
- No implicit sending to CRM, persistent companion profile, surprise outbound messages, external inference, impersonation or hidden psychological inference. The website explains that the guide is AI.
- Telegram has a different, separately consented chat pipeline; website integration does not itself constitute Telegram LIVE parity.

## Acceptance and verification

1. Run `node --test tests/friend-mind.test.mjs tests/ai-companion-smalltalk.test.mjs tests/ali-mode-switch.test.mjs tests/conversation-intelligence.test.mjs`; run applicable exact-HEAD Core, Specialist and Guard without weakening safety or privacy tests.
2. Validate Russian, English and Spanish on both mobile/desktop: support quiz → Friend → change tone → 8+ turn dialogue → no advice/no flirt/no questions → ordinary factual request → change topic/STOP. Guest route and authenticated route must agree on safe Friend replies.
3. Check all three tones for short non-repetitive turns; user-only context; no fake romance, services, prices, bookings or private data; explicit/medical/suicidal turns bypass casual treatment and get the existing verified safety response.
4. When protected PR merges, verify *served* `holistichouse.vercel.app` via the project's hourly production release only; PR creation or CI green does **not** prove LIVE.

**Cost:** no new model, provider, cron, runner, storage, paid inference, or out-of-band Vercel deployment.
