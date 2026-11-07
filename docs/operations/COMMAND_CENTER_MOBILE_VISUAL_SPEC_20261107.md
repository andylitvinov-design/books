# Command Center — approved mobile UX specification (2026-11-07)

Reference: owner-approved six-phone photomock in ChatGPT, 6 November 2026.
Canonical route: `/admin/command-center`. Role: authenticated owner/admin. View: responsive PWA dashboard; not the existing `/admin/automations` video-scout editor. The reference uses synthetic values and statuses only; production MUST read real data.

## Identity and visual contract
- Isolated dark navy #0f1323 canvas, violet #9861e6 accents, rounded 14–20px cards, concise white headings, legible secondary text and restrained lavender/peach glow.
- Mobile content target 390 CSS px; test 320/354/390/430. Desktop centers a max-560px phone layout.
- Top: Holistic House brand, Command Center subtitle, refresh and admin link.
- Bottom: fixed five targets (Home, Tasks, prominent central +, Agents, Projects); keep touch targets >=44px and iOS safe area.
- No auto-opening promos, consent modals, upsell, intrusive notification requests.
- In mobile browsers the task composer is owner-invoked and scrollable above the keyboard. Keyboard dictation remains available via native OS; do not show a microphone that records without a real approved service.

## Functional contract
1. Home: actual projects, tasks, running and blocked counts, priority list and project cards. Unknown backend is NOT a fabricated 0 or healthy status.
2. Central +: one plain-language task text, optional acceptance detail, project, priority, kind, optional source URL; owner-authenticated POST with CSRF/origin and rate limits; verified readback. Code changes remain `needs_spec` until an actual connected executor is authorized.
3. Tasks: all/active/blocked filters, tap for detail, real state and iteration count.
4. Detail: separate Accepted / Agent / PR / Tests / LIVE stages, source links, run receipts and evidence; PR merge != production. Unknown CI/LIVE never turns green.
5. Agents: real capability/connection registry; disabled connectors explicitly NOT CONNECTED; safe automation pause/resume.
6. Projects: real DB rows with counts, create project; do not seed synthetic customer or fake historical data.
7. Background execution: existing scheduler/PR ownership only. No second merge worker, no unbounded retries or false external-agent execution.

## Verification and acceptance
- Owner-only API and route deny unauthenticated users, no client-readable secrets.
- New task persists on reload in same database; success toast only after server receipt.
- Fixed dock does not obscure forms at 320/354/390/430; valid tab order and readable minimum 12–14px body content.
- Screenshot compare must be same role/route/state/viewport as reference; screenshot fidelity and Safari E2E require actual browser evidence, not CSS or CI claims.
- Existing `hh-merge-check` + specialist gates, protected merge, Vercel production SHA/alias check and functional admin interactions required before LIVE label.
- External Codex/Hermes/OpenClaw remain unavailable until credentials, sandbox, execution policy, budget and a real run receipt are validated.
- GLOBAL_PR_ONE_PUBLISH_V1 applies. No new scheduled workflow or paid AI service.
