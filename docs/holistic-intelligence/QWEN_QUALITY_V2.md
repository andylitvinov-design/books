# Holistic Intelligence · RU/EN Qwen quality and supervised-training pilot v2

**Scope:** deterministic routing and prompt/output quality improvements for the existing **one** owned Qwen model. No new model instance, provider, paid runner, quota, scheduler, or private client data access. Spanish behavior is unchanged.

## Improvements shipped in the inference code

- Secretary/Coach routing respects service requests, a client's refusal of advice, a new topic and corrections from booking to goal exploration. Only up to six recent supplied turns are examined; assistant messages cannot establish user intent.
- The shared model's role instruction gets **one original RU/EN style example** selected server-side; it neither includes private records nor pretends the example's content is user evidence.
- A post-generation guard rejects obvious false claims of completed bookings/payments/file actions, unsupported definitive diagnoses, excessive questioning, strongly wrong-language responses, and multi-step coaching pressure. A rejected answer falls back to the existing reviewed reply **without repeated paid inference**. This is not a medical classifier and does not replace preflight safety.
- The only model identifier continues to come from server `HH_AGENT_OLLAMA_MODEL`, never from a user's text, role or client payload. Current authentication, optional memory, consent, checked catalog, origin, and rate limits are unchanged.

## Measured results, with clear limits

On **52 original handcrafted routing regression cases** (RU, EN and one Spanish control), the previous router classified 39/52 and the revised router 52/52. The fixtures were written as part of the change, so this is a bounded regression score, **not an independent real-world accuracy estimate**. Guard unit tests accept useful short replies and reject fabricated actions/unsupported diagnoses; no claims are made about live Qwen generation or real user outcomes.

The separate `data/holistic-support/qwen-dialogue-sft-seed-v1.json` has **40 original synthetic demonstrations**, balanced across RU/EN and Secretary/Coach. It contains no real client messages or identifying private information. It is a small starter set, not enough to establish genuine model improvement or safe production weight changes.

## Optional LoRA research pilot — NOT production training

`scripts/qwen-training/train_lora.py` is an explicit, **manual** PEFT/TRL supervised fine-tuning harness. It defaults to the **Hugging Face** `Qwen/Qwen3-0.6B` checkpoint, whose exact identity/revision **has not been confirmed to match** the installed Ollama tag. Do not publish or merge weights until checkpoint identity, applicable license and artifact compatibility are verified.

- Running against fewer than 200 reviewed examples **fails closed** unless the operator explicitly supplies `--pilot`. The command only produces a local experimental adapter, marked `production_approved:false` and `evaluation_status:NOT_EVALUATED`.
- For an approved machine with already installed compatible versions of PyTorch, Transformers, PEFT, TRL, Datasets and Accelerate, a **research-only** invocation is: `python scripts/qwen-training/train_lora.py --pilot --steps 60 --output /tmp/hh-qwen-lora-pilot`.
- Synthetic demonstrations and role tests are not a substitute for a **separate blind RU/EN model-response holdout**, safety review, consent audit, latency/cost comparison and human evaluation.
- No LoRA job, saved trained weights, new provider, Ollama import, production model switch or training metric is asserted to have run. Avoid remote GitHub CI training, automatic cloud provisioning or new paid usage.
- The temporary laptop is never the permanent inference host. Any future reviewed adapter must be deployed to approved persistent cloud infrastructure **before** it may be removed locally.

## Conditions for actual Qwen LIVE

1. Merge this code on protected `codex/public-book-library`; independently verify the served Vercel alias's production deployment commit and functional smoke.
2. Confirm production `HH_AGENT_CHAT_ENABLED`, `HH_AGENT_OWNED_ENABLED`, `HH_AGENT_PRODUCTION_APPROVED`, `HH_AGENT_OLLAMA_ENDPOINT`, `HH_AGENT_OLLAMA_MODEL`, `HH_AGENT_OLLAMA_TOKEN` in secure server configuration; a valid HTTPS gateway is mandatory. The user's `ownedInferenceConsent` is required **for each request**. Do not use the laptop, set placeholders or enable new billable providers.
3. Confirm that both RU/EN roles produce answers from the same actual deployed Qwen, respect privacy/stop requests, and do not fabricate capabilities; separately measure fallback rate, latency and cost. Until this check passes, distinguish non-generative reviewed answers from true Qwen responses.

**Publication policy:** [GLOBAL_PR_ONE_PUBLISH_V1](https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md). Prepare one complete commit and preserve protected Core/Specialist/Guard gates. No claim that code merge itself activates a training pipeline.
