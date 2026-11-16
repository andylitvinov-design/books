# Holistic Intelligence · one Qwen, multiple prompt roles (RU/EN pilot)

**Scope:** Holistic House server chat `/api/holistic-agent/turn`. This is a presentation/intent-routing change, not another foundation model or an expanded clinical or action-taking permission.

## Architecture

- **One operator-configured model:** `HH_AGENT_OLLAMA_MODEL` on the existing HTTPS owned inference gateway. The gateway ignores any client-supplied `model` field and binds each request to its own operator-supplied model. Neither secretary nor coach can choose a second model or backend.
- **Secretary Mind** answers verified factual, service, scheduling and organization questions. It must not invent prices, availability or completed actions.
- **Coach Mind** asks one goal-clarifying question when the desired outcome is unclear; when clear, it may offer one optional small step. It must not diagnose, infer hidden motivations, promise treatment, or override a refusal.
- **Routing** is lightweight, deterministic, no external call, and uses the current utterance plus at most six recent user turns. Direct requests and client boundaries outrank older topics. Spanish remains on the existing neutral behavior; specialist routing is enabled for RU/EN only.
- **Existing authoritative layers stay authoritative:** signed-in account, same-origin, rate limits, safety preflight, signed Judgment Mind, approved catalogue, opt-in personal preferences and output checks. No module can schedule, pay, write memory or send messages merely by changing its role.
- **Local intent classifier** (`native-secretary`) is a cheap statistical classifier and rules reply path, **not another Qwen foundation model**. It can answer low-risk requests without generative inference.

## Model naming and temporary laptop tests

On 2026-11-12, local Ollama tags `hh-qwen3-test:latest` and `hh-coach-test:latest` both pointed to the same underlying weights blob. The coach tag adds a hard-coded persona to the Modelfile; it is not a separately trained intelligence. **Prefer the neutral `hh-qwen3-test:latest` for testing** so the server-selected role policy is authoritative. Do not delete either tag while a test or deployment references it; tags can be cleaned after smoke tests and cloud migration.

## Deployment and privacy

For production, the configured model and gateway must run on approved **cloud/hosted infrastructure**, not the user's temporary Ollama instance or laptop. The server's `HH_AGENT_OLLAMA_ENDPOINT` requires HTTPS, `HH_AGENT_OLLAMA_TOKEN` remains server-only, and inference remains gated by `HH_AGENT_CHAT_ENABLED`, `HH_AGENT_OWNED_ENABLED`, `HH_AGENT_PRODUCTION_APPROVED` and user `ownedInferenceConsent`. Never turn on a paid model/provider or new infrastructure automatically. Without an available configured owned gateway, existing deterministic fallback remains valid; do not represent it as a generated answer.

## Acceptance checks

1. Unit tests verify routing, refusals, RU/EN prompts, Spanish unchanged, no personal notes, and the single model identifier across roles with mocked inference.
2. Existing `natural-dialogue`, `native-secretary`, gateway, auth and safety regression tests must pass on the exact PR HEAD.
3. LIVE requires protected merge to `codex/public-book-library`, a confirmed Vercel deployment of that commit, and RU/EN end-to-end smoke with explicitly consented owned inference. Green CI or a local Ollama response alone is **not** LIVE.
4. Measure separately per role: correctly routed held-out cases, clarify-before-advice accuracy, output refusals, privacy and safety violations, response latency, fallback rate and actual cost. Improve the shared base only after measurements, not by creating duplicate role-specific Qwen models.
