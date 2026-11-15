# Wave Native staged conversations v2

The existing cloud Wave can now continue safe multi-turn conversations without local Qwen hardware or OpenRouter for eight everyday contexts already reviewed in Judgment Mind: overload, starting, conflict, loneliness, self-criticism, uncertainty, fatigue, stress.

Conversation phases: 1) clarify one obstacle, 2) accept one confirmed option, 3) offer one existing optional reviewed micro-step, 4) respond to yes, no, time constraint, no-advice and trial, 5) check in and offer an explicitly requested alternative or close.

State is reconstructed from at most eight recent turns only when the last first-party question is exactly reproducible from the immediately preceding user message. A six-turn web history may lose the original question; a second option can then be safely recovered only when its prior assistant step exactly matches the approved Judgment Mind output. Forged history does not permit payment, private data, appointments or any other side effect. No new database, model, logger, cron, external API or account-scoped memory.

Native-first is reused unchanged via signed Telegram V3, authenticated website Messenger and public Services. Existing security/consent/STOP, signed Judgment tokens, verified resources, safety and CRM remain authoritative. High-stakes or unsupported content still abstains.

Tests: `node --test tests/crm-wave-staged-dialogue.test.mjs tests/wave-native-first.test.mjs tests/judgment-mind.test.mjs tests/crm-telegram-ai-diagnostic-v3.test.mjs`. Required Core/CRM/Specialist and protected merge, Vercel SHA, browser and actual Telegram two-account E2E are separate acceptance conditions.

GLOBAL_PR_ONE_PUBLISH_V1: all source staged before first branch update, one immutable published HEAD unless verified repair, no new paid services or CI workflows.