# Holistic Native AI: Qwen-based RU/EN alignment and student experiment (2026-11-12)

## What is actually implemented

The existing `mind-role-router.mjs` uses **one** configured Qwen instance and two policies: Secretary and Coach. This change adds a bounded, pure **response gate** for Qwen's existing server-side owned-mode reply, with a fallback to the trusted, previously implemented non-generative reply if a clear contract breach occurs. The gate filters only Russian and English. It does not create an agent, make bookings, infer psychological conditions, store chats, generate new prices, request new secrets, or transmit sensitive information.

The fixture contains six **previously observed** Qwen3-1.7B output samples on synthetic user prompts. A CPU-only, reproducible first-party binary feedback student is actually fitted to these **hand-reviewed teacher observations**. Its six-example dataset is tiny and non-independent, so the student is deliberately **not used for production decisions** (`deployable:false`). The separate deterministic reply gate is the only proposed runtime change. This is **not fine-tuning the Qwen base weights**, and is not a claim that a new LLM has been trained. Qwen3-1.7B GGUF Q4 is an inference checkpoint, not an MLX/PEFT training checkpoint.

## Reasons for gating

In observed synthetic Qwen runs, some Russian stop requests received English responses, one ambiguous work question received multiple suggestions before clarification, and Qwen occasionally emitted an empty `<think></think>` wrapper. The model sometimes responded correctly to RU/EN, but none of these short trials establishes reliable therapy, long-form memory, or production quality. Previously merged PR #4414 has already unified roles, and #4416 improved greetings; do not duplicate either.

## Guard order and acceptance

1. The **existing** server identity, same-origin, rate limits, preflight safety, verified facts, opt-in and memory boundaries determine whether owned inference is allowed. No model control may change those choices.
2. `generateOwnedOllama()` produces a candidate reply. Only when `provider === 'owned'` does the new RU/EN response guard screen it. Browser inference and Spanish stay untouched.
3. Empty `<think></think>` wrappers can be removed; non-empty reasoning tags are rejected. Unambiguous wrong-language answers, more than one question, clear fabricated completed actions, questions after explicit stop, and coach advice without explicit current-user goal produce `accepted:false`.
4. Existing `acceptNaturalOutput()` still applies HTML/link/impersonation checks. Existing `finishNaturalDialogue()` returns its trusted fallback if the gate or the original output validator refuses text.
5. This is a heuristic, **not a language detector, clinical safety assessment, or hallucination-proof validator**. False rejects are possible. Its acceptance is not evidence of appropriate psychological advice. Human review, end-to-end browser and multi-turn QA remain release requirements.

## Experimental student (NOT deployed)

```
node --test tests/qwen-reply-gate.test.mjs tests/qwen-feedback-student.test.mjs
node scripts/qwen-feedback-student.mjs /absolute/path/to/experimental-student.json
```

The student fits 256-dimensional hashed character/word features with a logistic objective and outputs reproducible coefficients plus SHA-256 of the six-example teacher dataset. Its output states `fineTunedQwen:false`, `deployable:false`, and does not authorize routing, memory, payments, or private data access. Do not promote from in-sample scores. For meaningful distillation, obtain a genuinely large, safe, reviewed synthetic Qwen-teacher dataset with separate locked development/test cohorts, verified rights and opt-in, then rerun independent native gold and safety testing.

## Remaining blockers to genuine Qwen SFT and LIVE

- Connected Mac's remote execution quota is exhausted; no legitimate further remote access through that integration this month. Local Qwen weights have not been changed by this patch.
- The Oracle E2 Micro has insufficient memory for Qwen inference; A1 free capacity and its running endpoint have not been verified. Do not set Vercel `HH_AGENT_OWNED_ENABLED=true` or claim a hosted Qwen until authenticated TLS, confidential bearer, latency under server timeout, and safe capacity are demonstrated.
- For genuine Qwen3-1.7B LoRA/QLoRA, use a **trainable upstream checkpoint**, not the GGUF Q4 inference file. GPU/MLX compute, disk/RAM, and zero-additional-cost eligibility require verification before trying. Do not download training weights to the client's machine or create a paid GPU without explicit authorization.
- One cohesive PR only, protected exact-HEAD CI, privacy and consent gates, independent Vercel served SHA, and real signed-in RU/EN Messenger E2E are required to claim LIVE. A merged, passing change can improve model *response rejection quality* without making the trained Qwen model available to site users.