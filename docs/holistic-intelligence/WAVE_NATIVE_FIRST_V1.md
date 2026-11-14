# Wave Native First v1 · Holistic House

Owner decision: Wave's first-party cloud dialogue is the default for narrow, reviewed simple intents. The Qwen model on the owner's computer is **not** an always-on server and is not needed for Native Wave. Only genuinely complex consented conversations use the existing, strictly zero-priced OpenRouter adapter where configured and verified. No new inference provider, server, GPU, scheduler, CRM, database, key, pricing or telemetry system.

## Channels

- **Telegram signed V3:** after the existing secret-verified webhook, encrypted session, separate purpose consent, rate quota and acute-safety checks, the post-commit worker tries `waveNativeTurn` before `v3Generate`. No model call for reviewed simple intents. Complex turns retain current provider selection and validated free-cost policy; outage falls back to the separately labelled limited local reply. STOP and CRM handoff are unchanged.
- **Authenticated website Messenger:** after same-origin/verified account, rate/safety/consent and session-state/judgment handling, reviewed small talk and FAQ use the same Wave Native router, prior to catalog compilation and any optional owned-model inference. Explicit paid/medical/booking/profile/saved-memory requests follow existing specialized workflows.
- **Public Services:** existing first-party Consultant Mind retains actual verified product recommendations, while simple social/identity questions use shared Wave Native without external API calls. No raw chat text is sent elsewhere.

## Confidence and abstention

Wave Native only handles fixed factual identity/FAQ intents or conversation signals backed by Conversation, Reaction and Reasoning Mind. Explicit danger cues, long prompts, links/markup, direct actions, unknown/low-confidence and complex content return null rather than fabricated advice. Narrow confidence is not an evaluation of the client's personality or mental state. Existing provider privacy/consent rules remain in place.

## Acceptance and limitations

1. `node --test tests/wave-native-first.test.mjs tests/crm-telegram-ai-diagnostic-v3.test.mjs tests/conversation-intelligence.test.mjs` plus Source, TypeScript, Core, CRM, Guard and applicable Specialist; do not waive any release check.
2. Telegram opted-in end-to-end: `Поговорим?`, `О Qwen` must return without a provider call. Simulated disabled/free-rate-limited provider still yields a constrained local response. Complex questions may require model access; provider unavailability must not fabricate facts. /stop stays terminal.
3. Services and authenticated web: validate RU/EN/ES ordinary social request, customer service recommendation and noninterference with safety, signed choices, booking, personal data, and checkout. Verify phone browser, actual Vercel READY production SHA and canonical alias after protected merge.
4. 24/7 **cloud independence of local laptop**, not a claim of perfect uptime: Telegram, Vercel and database outages remain possible. A narrow rule/intent reply is not a universal generative model and cannot answer every complex question.

GLOBAL_PR_ONE_PUBLISH_V1: stage all changes before publication, one immutable HEAD, no no-op CI waves, protected native auto-merge only.
