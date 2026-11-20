# Holistic House × OpenMotion · safe incremental integration
**Date:** 20 November 2026 · **Owner issue:** https://github.com/andylitvinov-design/books/issues/5224
**Upstream:** https://github.com/nexu-io/openmotion · Apache-2.0 application license (all media/templates/fonts/provider terms assessed separately).

## Status and scope (do not confuse implementation with LIVE)
This change adds a *metadata-only* reference picker to the existing \`MandalaFirstVideoStart\` client UI, lazy-loaded on explicit expansion. Metadata snapshot is from OpenMotion's public \`web/catalog/hyperframes.json\` (891 video references, not locally duplicated videos) and \`library/templates/catalog/catalog.json\` (287 Motion guide IDs at the checked source revision). The upstream promotional 300+ claim is not a guaranteed count of fully editable, reusable video projects. Its own catalog README says several are reference guidance without a portable project; even nine edited candidates have pending visual acceptance.

**Implemented P0:**
- 891 searchable external video-reference entries, public source attribution when available, original hosted video link opened only after a user click; no remote video, logo, music, image or external JS downloaded into production bundles or copied to Vercel; EN/RU/ES library controls.
- 287 indexed guide IDs for provenance and a link to the official upstream Motion.md archive; **we do not claim all 287 guides have been imported or executed by Holistic House**.
- Explicit "Make my version" maps movement/ratio/length to an existing approved first-party quick-video preset and passes through \`buildFirstVideoDraft\` and the existing renderer/exporter. User-provided goal text is preserved. This is an **approximate original local adaptation**, not a 95% replica, not a new AI model, and not the full OpenMotion HTML/GSAP runtime.
- No new provider, API key, service, cron, payment path, user upload or worker. The large reference index is a separate lazy JS chunk, mounted only when the visitor opens the disclosure. Existing local MP4/WebM and iOS fallback remain unchanged.

**Not yet implemented:** running the OpenMotion Studio/GSAP/Chromium engine on a private backend, server-side render jobs, actual Motion.md shot-by-shot HTML composition or import of rights-cleared source media. A website catalog is not a deployment of OpenMotion.

## P1 · Full engine, isolated worker (delivery checklist)
1. On an *already owned, budget-verified* server (not a user laptop, not Vercel request functions), checkout **SHA-pinned** upstream \`nexu-io/openmotion\`, keep \`LICENSE\` and \`NOTICE\`, review supply-chain dependencies, and install its specified Node runtime, Chromium, FFmpeg and FFprobe. Its \`npm start\` launches a persistent local app; do not expose local filesystem or stdio MCP directly to the public internet.
2. Put a private, authenticated Holistic House backend adapter in front of the worker. Endpoints should submit a validated composition job and read/cancel status; do not proxy arbitrary upstream HTML or foreign URLs into Chromium. Private per-user Supabase storage and tenant-scoped RLS; signed artifact downloads; short-lived idempotency keys. Need a separate data/access/security review before enabling.
3. Job contract: \`{schemaVersion,ownerId,projectId,referenceId,motionGuideId,locale,aspect,scenes,voice,soundtrack,sourceLicenses,consent,renderPreference}\` validated server-side. Never include raw profile, tests, client health information, tokens or payments in template metadata or public logs. For therapeutic video data, apply purpose limitation and retention rules.
4. No direct arbitrary-site download from user-supplied URLs. Use allowlisted, license-checked assets, hash/provenance registry, safe HTML sandbox without network/exec, capped fps/duration/resolution and bounded concurrent Chromium/FFmpeg workers. Job states queued/running/ready/failed/cancelled, persisted checkpoint and cancellation/retry, timeout cleanup, provider cost audit. Only signed private output becomes visible to the client.
5. Route user-initiated optional AI video/image/voice generation through the existing provider/consent/credit budget. **Default remains first-party local**; no implicit Seedance/Suno/ElevenLabs paid calls. Never collect API keys in the browser.
6. Implement Motion.md → typed storyboard grammar, measured transitions/timing, text keyframes, audio lanes and license provenance; support edits via the *existing* Video Studio timeline, not a second confusing video editor.
7. Test iPhone/Android (screen sleep, repeat attempts, cancellation, network interruptions, audio sync, preview vs output shot identity), Safari native-export fallback, mobile one-screen navigation, EN/RU/ES, 9:16/1:1/16:9, 20/30/60 seconds, rights checks, RLS and cost safeguards. Verify rendering final MP4, not just HTTP 200.
8. Production via existing **protected PR → exact-HEAD Core/Specialist/Guard → native auto-merge → existing hourly Vercel publisher → independently verified canonical alias+SHA+real mobile video**, never a manual redeploy. Keep the optional worker OFF until acceptance and budget verified.

## Risk register
- **Rights:** Apache-2.0 application does not grant permission to clone reference videos, trademarks, logos, music, voices or model output. External preview links only until cleared. Original examples may be considered for a later fully credited import after per-asset review.
- **Cost:** OpenMotion source is free; persistent CPU storage and paid model usage are not inherently free. No new spending without explicit authorization.
- **Security:** executing remote HTML/JS with Chromium or exposing MCP to the web risks exfiltration, SSRF, and multi-tenant leakage. Worker must be isolated.
- **Truthfulness:** a style-reference adaptation is not an editable clone. No measured 95% fidelity without reproduced tests.
- **Performance:** never load the large index or external videos on initial page; lazy mount and no autoplay.

## Focused pre-merge checks
\`node --test tests/openmotion-video-reference.test.mjs\`
Plus mandatory source-HEAD TypeScript, Next build, Specialist, protected merge guard and mobile WebKit/browser acceptance. Do not call this LIVE or full-engine enabled until both checks and served release can be verified.
