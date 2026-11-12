# Holistic Native AI — cloud-only Qwen + E5 / semantic inference kit

**Status:** source and security tests only; **not provisioned, not configured in Vercel, not LIVE**. No paid accounts, GPU, API keys, external inference calls, cron or database migrations created by this PR.

Program: https://github.com/andylitvinov-design/books/issues/4367

## Goal and integration point

The existing Holistic House Messenger / Cognitive Core retains the only conversation authority: identity, consent, privacy, memory, safety, verified facts, booking and payments. Models do NOT become separate personas, tool callers or decision makers.

The existing protected route /api/holistic-agent/turn already integrates generateOwnedOllama from lib/holistic-support/owned-ollama.mjs. This gateway implements exactly the HTTPS /api/chat and Bearer token contract expected by that adapter. It also provides /api/embed for future optional semantic intent ranking. Current production Messenger does NOT yet call /api/embed. No chatbot route files are modified by this kit.

Architecture:

1. Existing authenticated Holistic House site on Vercel -> protected same-origin API.
2. Existing authorized owned-model adapter -> HTTPS and server-only Bearer.
3. Cloud-only Caddy TLS -> Node 22 gateway bound to 127.0.0.1:8787.
4. Gateway -> Ollama at 127.0.0.1:11434 running qwen3.5:0.8b.
5. Semantic route -> qwen3-embedding:0.6b via the same Ollama process, OR the optional first-party E5 worker at 127.0.0.1:8788.

No weights, model binaries, Python/Torch, inference or new apps on the owner’s computer, phone or visitors' devices. Model weights reside on the controlled cloud VM only.

## Zero-additional-fee path: important limits

An OCI Always Free Ampere A1 instance may be an option **after confirming free eligibility**. Oracle's official 2026 documentation describes the Always Free A1 allowance as 1,500 OCPU-hours plus 9,000 GB-hours monthly, equivalent to **2 OCPUs and 12 GB memory** on Always Free tenancies. Some home regions lack available free capacity, account verification may be required, and provider terms can change. This source PR does not create a cloud account or guarantee permanent $0 hosting. Confirm disk, bandwidth, quotas, potential reclamation and spending limits in the actual account first. Do not upgrade to Pay-as-You-Go or exceed Always Free limits without explicit owner approval.

Vercel Node Functions cannot hold the weights directly: current maximum function bundle size is 250 MB uncompressed. The official Ollama qwen3.5:0.8b tag is currently around 1.2–1.3 GB on the cloud disk (custom GGUF quantization can be smaller); qwen3-embedding:0.6b around 639 MB; E5 Small raw weights 471 MB. Inference RAM and CPU latency must be measured separately. CPU-only chat on 2 OCPUs may be slow. The existing site owned-model call has a 16-second timeout; the gateway has a tighter 14.5-second upstream limit and 48-token default response cap. If it cannot meet the target, retain the native fallback and do not claim real-time chat.

Sources:
- https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- https://vercel.com/docs/functions/limitations
- https://ollama.com/library/qwen3.5
- https://ollama.com/library/qwen3-embedding
- https://huggingface.co/Qwen/Qwen3.5-0.8B
- https://huggingface.co/intfloat/multilingual-e5-small

Qwen and E5 weights remain third-party **open-licensed** model artifacts; this gives independent self-hosted inference, NOT a claim that Holistic House trained the weights from scratch. Third-party AI inference API usage = zero after cloud setup. Initial model downloads from model registries happen on the cloud VM once and must be source/rights-verified.

## Operator checklist — all commands execute ONLY on an authorized CLOUD VM

1. Provision an A1 ARM64 VM only after the provider confirms Always Free eligibility and availability for the account, with sufficient free disk/egress and an account-level spend cap/alert. Public inbound only 80/443, restricted admin SSH. Never expose 11434/8787/8788 publicly.
2. Install reviewed ARM64 releases of Node.js 22, Ollama and Caddy using official channels. Configure Ollama to bind **127.0.0.1:11434 only** and disable external model/cloud features. Node gateway binds localhost exclusively.
3. Pull lightweight models **on the cloud VM**, not on the personal machine: run “ollama pull qwen3.5:0.8b” and “ollama pull qwen3-embedding:0.6b”. Review manifests/licences and run “ollama list”. Do not download either model into GitHub or Vercel.
4. Copy the gateway module and deployment examples from this repository into /srv/holistic-native-runtime. Install it under a dedicated unprivileged service account. Copy runtime.env.example to **cloud-only** /etc/holistic-native-runtime.env; generate an unpredictable secret with “openssl rand -hex 32” on the VM; set HH_NATIVE_RUNTIME_TOKEN and chmod 600. Do not paste/commit/display that value in chat, CI or repository.
5. Review the systemd example. Replace ai.example.org in Caddyfile.example with a domain belonging to Holistic House; point its DNS to the VM. Allow Caddy to obtain a trusted TLS certificate. Caddy forwards the Authorization header to 127.0.0.1:8787 and has no public route to Ollama. Verify server identity, certificate, no sensitive logging and firewall rules.
6. Smoke on the cloud VM and over HTTPS: missing/wrong token => HTTP 401; valid bounded /api/chat => an actual text reply; valid /api/embed => a finite numeric vector. Verify output quality RU/EN/ES, CPU load, time-to-first-token, end-to-end 16-second deadline, concurrent load, 24/min and max 2 in-flight caps, rollback and no private transcript storage. No model can book, pay, send messages or view client memory by itself.
7. **Only when the VM is verified healthy and authorization for server data processing is reviewed**, configure the existing Vercel project Production sensitive secrets/flags through the trusted admin UI (do not set publicly exposed variables): HH_AGENT_CHAT_ENABLED=true, HH_AGENT_PRODUCTION_APPROVED=true, HH_AGENT_OWNED_ENABLED=true, HH_AGENT_OLLAMA_ENDPOINT=https://YOUR_REAL_AI_DOMAIN/api/chat, HH_AGENT_OLLAMA_MODEL=qwen3.5:0.8b, HH_AGENT_OLLAMA_TOKEN=THE_PRIVATE_CLOUD_TOKEN. Check exact env names in current source and actual target before modification. The existing chat requires an authenticated account and explicit user consent for its “AI on our server” mode.
8. Verify the deployed Vercel SHA and real signed-in multilingual mobile conversation on the canonical domain; compare against the independent tests in PR #4383. Preserve current fallback, kill switch and safe refusal, then consider a bounded canary. Do **not** enable native model mode by default without privacy review, capacity tests and owner consent.
9. Disable by setting HH_AGENT_OWNED_ENABLED=false; no paid third-party AI fallback and no model file remains on the user's device. Remove VM only after reviewed deprovisioning.

## Optional original E5 Small model

The deployment defaults to qwen3-embedding:0.6b on the same Ollama runtime to avoid the often significant extra PyTorch/Python memory and ARM package complexity. To choose E5, download the approved MIT-licensed intfloat/multilingual-e5-small repository (version-pinned and SHA-verified) **to /srv/holistic-native-models/multilingual-e5-small on the VM only**. Check a compatible CPU ARM64 Python environment, install the optional requirements-e5.txt in an isolated virtualenv and launch e5-worker.py bound only to 127.0.0.1:8788. This worker requires pre-installed files and has offline model loading enabled. Then set HH_NATIVE_EMBED_BACKEND=e5 in the VM's private env; call /api/embed with model multilingual-e5-small.

Do not mix embedding vectors from E5 and Qwen in one index. Regenerate semantic prototypes if switching and test usefulness before connecting the embedding route to the common Cognitive Core. The E5 CPU ARM package set and real weights are **not tested by this source-only PR**. The current chat remains unchanged until explicit controlled rollout.

## Quality/security acceptance

Run Node 22 source tests: node --test services/holistic-native-runtime/gateway.test.mjs. Run Python syntax check: python3 -m py_compile services/holistic-native-runtime/e5-worker.py. Full secured service integration also needs cloud installation, the existing authenticated Ollama adapter, CI/Core/Specialist, real browser, TLS and actual model quality/latency checks. Gateway denies unknown routes, non-Bearer requests, tool calls, unknown models, streamed requests, excessive input or concurrency; protects against user-supplied upstream URLs and never logs chat text.

**Merging this kit alone is not a functioning free model server.** Provisioning requires an eligible cloud account/domain and consented deployment; neither is currently available through the connected GitHub/Vercel/Supabase tools.
