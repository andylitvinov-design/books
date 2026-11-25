# HH VIDEO VAULT 500 — implementation status
Canonical specification: https://docs.google.com/document/d/1TwOGKqhkk-3dFOgShyXVPXXd2o4hJ06X4kaSwFn5JKk/edit

This PR implements **only a fail-closed, pure eligibility / dedup / cost / selection foundation**. It does not implement or claim the full approved specification. No credentials, cloud writes, migrations, new workflows, downloads or payments are introduced. The feature is OFF by default.

Baseline: 44 legacy editorial MP4 masters require independent original-footage and rights checks; 684 procedural clips are excluded. Connected Supabase holistichouse has no video vault table. Cloudflare account billing/usage/bucket cannot be read with the available connections. Thus COST_GATE=HOLD, uploaded and generator-eligible R2 assets **verified in this task** = 0; external bucket inventory remains unknown.

Remaining work before LIVE: read Cloudflare account usage and permission; confirm free tier risk; create private R2 bucket only after cost approval; extend existing offline importer with opt-in R2 dry-run/apply, ffprobe/ffmpeg, immutable PUT/HEAD/full checksum readback and reconcile; add internal RLS-protected Supabase asset index and audit trail; implement authenticated server-only asset-ID presign/search/resolve and existing four-shot Studio integration; test real rights, people releases, Safari 206/CORS/Canvas, export and 20 distinct user projects; run exact-head CI and Vercel deployment SHA acceptance; upload in approved stages 20 → 100 → 250 → 500. Do not count URLs, AI, crops or procedural renders.
