# Google Veo 3.1 Lite — Silent Video + MCP Pilot

Holistic House Video Studio · 2026-11-08 · owner-only / feature-gated.

## Scope

Add Google Veo 3.1 Lite text-to-video as a provider in the existing Holistic House video pipeline, not a replacement editor, duplicate wallet, separate payment service or public generator.

- Official Vertex AI model: **veo-3.1-lite-generate-001**, region **us-central1**.
- 1080p; 16:9 or 9:16; one shot per request, durations 4 / 6 / 8 seconds.
- Audio generation always explicitly **false** (generateAudio:false). Use Holistic House music and narration after visual QA. No unapproved presenter or owner digital twin substitution.
- Provider response is a private MP4 object in Google Cloud Storage, not a shareable site URL, completed montage or video publication.
- Existing cinematic-production router remains the rights/quote/payment policy; new provider starts unavailable until authenticated account and approval.
- No new paid cloud account, billable job, GCS bucket, API token, GitHub workflow, scheduled task, autopublishing or payment action is created.

## Components

- lib/veo-video.mjs — scene validation, cost quote, Vertex AI predictLongRunning and fetchPredictOperation, signed service-account OAuth, sanitised errors; one paid call, no auto-retry.
- app/admin/videos/veo-actions.js — requires live admin authorization, rights acknowledgement and approved exact quote; gated by HH_VEO_PAID_ENABLED.
- components/veo-scene-studio.tsx — owner-only quote/request/status panel in the existing /admin/videos (RU/EN/ES).
- scripts/mcp/veo-lite.mjs — project-scoped **stdio MCP server** enabled for local compatible editor/agent by .codex/config.toml and .vscode/mcp.json. Exposed tools:
  1. **veo_lite_readiness**: offline configuration flags.
  2. **veo_lite_quote**: offline cost estimate.
  3. **veo_lite_generate**: paid generation, OFF by default.
  4. **veo_lite_status**: manual read of an existing task, never a new render.

Run offline tests with: node --test tests/veo-video.test.mjs tests/veo-mcp.test.mjs

A six-second 1080p silent scene estimates **$0.30 USD** at the published $0.05/s rate; 30 seconds of source clips totals **$1.50** for exactly one attempt per scene. Retries, VAT, storage, audio, montage and other costs are not included.

Important: Project MCP configuration does not register a global ChatGPT connector or log into Google Cloud. A compatible authorized local agent must actually start this MCP process. It will remain unable to submit paid jobs without verified Google Cloud credentials, approvals and server opt-in flags.

## Environment variables (server only)

| Name | Description |
| --- | --- |
| HH_VEO_GCP_PROJECT_ID | Dedicated Google Cloud project with enabled Vertex AI |
| HH_VEO_GCS_OUTPUT_URI | Approved private gs://bucket/private-prefix/ folder |
| HH_VEO_SERVICE_ACCOUNT_JSON | Sensitive provider-issued service-account credentials (do not print or commit) |
| HH_VEO_PAID_ENABLED | Server opt-in, must equal true; default OFF |
| HH_VEO_MCP_ALLOW_SUBMIT | Additional MCP-only opt-in, must equal true; default OFF |

Never put credentials in Git, issue comments, frontend code, browser storage, screenshots, logs or public environment variables. Existing YouTube/Drive OAuth secrets are NOT Google Cloud Vertex AI service credentials.

## Before first live paid generation

1. Request owner approval for exact Google provider/project, authorization scope, destination Vercel project and secret name; independently approve any cloud billing, new storage or model expenditure.
2. Confirm Veo model entitlement, price, region, quota and terms for the actual account, plus private bucket/IAM configuration. No cloud resources are provisioned by this implementation.
3. With explicit authorization, create the provider credential through a supported authorized Google Cloud workflow, and store it as a private server environment variable with a verified metadata readback. Do NOT solicit or paste a secret in conversation.
4. Before customer-facing or multi-scene production, implement a durable paid-job/receipt ledger and retry/idempotency guard. Individual admin scene generation is only a pilot, not a client checkout system.
5. Generate only a specifically approved short test, then verify operation ID, source MP4, real motion, duration, audio absence, scene continuity, real mobile playback, user approval and actual consumption.
6. Archive approved masters to Google Drive; public distribution via separately approved YouTube/Metricool then lazy website embed. Never auto-post client-private media.

## Release gates

- [GLOBAL_PR_ONE_PUBLISH_V1](https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md)
- [Holistic House CI/LIVE policy](../operations/CI_RELEASE_POLICY.md)
- [Server secret handling](../integrations/AGENT_SECRET_AUTOMATION.md)
- [Video publishing SOP #219](https://github.com/andylitvinov-design/ai-projects-brain/issues/219)

Mocked tests are not a real Vertex AI connection or successful video. Production requires protected merge, verified Vercel deployment SHA, owner-only UI QA and provider E2E separately. Leave paid feature flags OFF until all external dependencies are authorized.
