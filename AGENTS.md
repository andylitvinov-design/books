# Holistic House: screenshot-driven UI work

## Mandatory PR one-publish and single-writer preflight

Before any source, branch or PR write, read [GLOBAL_PR_ONE_PUBLISH_V1](https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md) and [CI_RELEASE_POLICY.md](docs/operations/CI_RELEASE_POLICY.md). This applies to every GPT chat, autonomous automation, repair worker and code-producing agent. Resolve the production base, open matching PRs, and the active GitHub PR ownership lease before making changes. One PR has exactly one active source writer. Stage and locally verify the coherent fix, then publish a single atomic source HEAD; do not make a sequence of remote file writes.

Do not synchronize an otherwise valid PR with production solely because the base advanced. Freeze the published HEAD while exact-HEAD mandatory CI is queued or running. A new remote HEAD is justified only by a verified failing check, proven conflict, security/correctness repair or an explicitly required freshness gate, and only with the current PR lease. Do not use empty commits, cosmetic edits or reruns to wake CI. Let the existing `hh-merge-check` and protected native auto-merge complete successful Ready PRs. Never bypass security, Specialist, browser or review protection, and do not publish where incremental CI/Vercel cost cannot be bounded.

When the owner provides a screenshot, reference image, Figma export, or mockup and asks to create, rebuild, redesign, or correct any page, **read and follow .agents/skills/visual-to-code-pro/SKILL.md before changing UI code**. Its FIRST gate is page identity: reference and actual must share the same route/query intent, role, auth state and dashboard/editor view type. A service editor screenshot is not a visually failed practitioner dashboard; fix wrong OAuth/automatic navigation before comparing pixels. Use its reference specification, preserve working APIs/auth/data, perform rendered screenshot comparison, and never call CSS/unit tests alone a visual match.

The canonical website is https://holistichouse.vercel.app. The GitHub default branch codex/bootstrap-books is **not** automatically production. See the CI / PR / LIVE delivery policy below for production release verification.

## Sitewide UX policy — no unsolicited popup requests (owner, 2026-11-02)

**P0 product decision:** Never automatically open or mount a promotional, analytics/cookie opt-in, newsletter/subscription, notification-permission, survey, review/rating, "help improve the site", upsell, or similar nonessential request as a floating dialog, modal, toast, bottom sheet, fixed overlay, or blocking full-screen prompt. This applies to first visit, route change, timers, scroll, returning visitors, mobile, RU/EN/ES and authenticated sessions. No rebranding or delayed animation may bypass this policy. In particular, do **not** restore `FirstPartyStatsNotice` or invent a replacement for it.

**Supported alternatives:** Show helpful information inline in normal page flow, link to the dedicated `/privacy` settings, or put an optional action in an existing user-invoked menu. Never obscure meditation/video playback, primary actions or the mobile bottom navigation. No automatic marketing push/notification permission requests. Keep the pre-existing approved compact navigation/ribbon without turning it into an overlay.

**Allowed exceptions:** Dialogs intentionally opened by a clear user action (e.g. login, booking/payment confirmation, media picker), unavoidable security/transaction failures and legally mandatory notices. Required privacy consent must be obtained *before* nonessential personal tracking is enabled; removing a banner does **not** give permission to enable GA4, Meta, advertising identifiers, personal-data profiling, sensitive test tracking, or nonessential cookies. Any mandatory first-use notice must be narrowly scoped, accessible, reviewed for the actual jurisdictions served and approved by the owner; do not camouflage it as a marketing popup.

**Release guard:** `tests/public-page-traffic.test.mjs` locks the approved global shell component mounts and forbids the obsolete stats prompt. An added global widget requires explicit owner UX review and a deliberate guard change, **not** an automatic whitelist update. For any changed public mobile shell, verify fresh and returning guest sessions on RU/EN/ES at phone widths 320/390/430, plus opt-out/private paths; no unrequested overlay and no blocked player or bottom navigation. CI/test success is not a substitute for rendered live mobile E2E.

**Holistic Light — Warm & Alive is the shared design contract for future mockups and edited pages.** Before designing or accepting a Holistic House page, read [Design Bible v1.1](docs/design/HOLISTIC_LIGHT_DESIGN_BIBLE.md) and use opt-in semantic tokens from app/holistic-light-tokens.css. Preserve approved My Course teal and Business wood exceptions. For new/changed public UI, run tests/holistic-light-design-qa.test.mjs and route-matched browser/visual QA. Capture read-only guest public design snapshots with scripts/holistic-light-design-qa.mjs. A generic score is never a substitute for same-view screenshot overlays or real interaction E2E.  Keep existing pages/components instead of adding duplicates. Preserve EN/RU/ES routes, signed-in navigation, private data, CSP nonce, CRM, protected media, real service IDs, consent and existing E2E contracts. Never claim real delivery, booking, payment, OAuth, or photo upload from a mock, a screenshot, HTTP 200 or CI alone. Use synthetic screenshots in public artifacts and respect privacy.

## Automatic visual QA tool order

For each owner screenshot, URL or Figma-based page design request, **do not ask the owner to name tools**. Inspect the correct canonical route and auth/view state first; then invoke the tools that are actually connected:

1. **Existing live page as reference:** use Chrome DevTools MCP for read-only DOM, CSS, asset and geometry inspection; if unavailable, use the existing authorized browser/Playwright CI approach and clearly state the limitation.
2. **Figma source link supplied:** use Figma MCP for design context/variables/screenshot (only with an actual Figma source). Do not insert Figma into an image-only workflow or invent access to a file.
3. **Rendered implementation:** use Playwright MCP interactively where connected, plus the GitHub Actions Playwright Chromium/WebKit acceptance workflow. Execute real click/navigation and responsive screenshot tests, then calculate overlay/difference only on the same route/state/viewport. See docs/design/VISUAL_MCP_AUTO_QA.md.
4. The first deployed screen can NEVER be accepted based solely on text/CSS contracts, screenshots of a different view, HTTP 200, CI green, or successful OAuth initiation. State separate evidence for visual fidelity, real account E2E, and Vercel READY/SHA.

Verified tool versions and project setup are declared in .codex/config.toml and .vscode/mcp.json, but **repository files do not install MCPs into ChatGPT nor grant browser/IDE permissions**. Only claim tool availability after successful tool calls. A failed or blocked MCP connection is not a reason to skip the independent GitHub browser workflow or to fabricate visual acceptance.

## CI / PR / LIVE Delivery

Follow [CI_RELEASE_POLICY.md](docs/operations/CI_RELEASE_POLICY.md) for agent ownership, CI, PR delivery and LIVE acceptance.

## Provider credential autonomy: bounded, consented, agent-first

Use `docs/integrations/AGENT_SECRET_AUTOMATION.md` for consent-gated provider integration. This file does not itself grant permission to create, read, change or transmit secrets. The preceding screenshot-driven visual policies and `docs/operations/CI_RELEASE_POLICY.md` remain authoritative; do not bypass production protections.

Verify current deployment identity first: `codex-public-book-library`, project `prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b`, team `team_OSf690d0nxRHWVMXCElA8i95`; production branch `codex/public-book-library`. Re-check live IDs instead of trusting local metadata.

1. Search existing **authorized** app connectors, provider OAuth, environment
   variable **names and targets only**, integration configuration and linked
   services before asking the owner to configure anything.
2. Prefer existing GitHub/Vercel/Supabase/provider connectors or provider-issued
   short-lived, scoped credentials. An authorized connector/account establishes
   access, not consent for every action. Before creating persistent credentials
   or transmitting a secret to a destination, obtain explicit owner confirmation
   for that specific action whenever required by the runtime. Identify provider,
   destination project, secret name, target and scope without exposing its value.
   A general automation request, issue/PR URL, token possession or `--apply` is
   not that confirmation. After approval, use the official provider API or a
   CSPRNG for application-owned HMAC/webhook secrets; coordinate both ends.
3. Only after the action is authorized, create new Vercel secrets using the
   connected project tool with
   `upsert=false`, `type=sensitive` (Secret) and the smallest appropriate
   environment/branch. Never accidentally replace an existing value, use
   Production credentials in Preview, or assign secret values to
   `NEXT_PUBLIC_*`, `VITE_*` or any other client-visible variable.
4. Do not retrieve/decrypt working secret values for convenience. Never expose
   secrets, API tokens, session cookies or personal data in chat, source code,
   issues, logs, screenshots or command-line arguments. Prefer process stdin
   or protected app-to-app calls over plaintext files or shell history.
5. Before a rotation, verify the provider supports overlap/rollback; update
   both ends, redeploy, run authorized real E2E, and only then revoke the old
   value. Avoid unnecessary rotations. Environment-variable write != deployed
   feature != proven external delivery/payment.
6. One-time provider OAuth, MFA/passkey, legal/financial consent, account
   verification, permissions not already granted and enabling paid services
   still require explicit owner action, in addition to any per-action credential
   confirmation above. First complete independent work and
   provide one exact link + minimal click instructions; never ask for a raw
   password/token pasted into ChatGPT.
7. No spending, mass sends, unapproved integrations, permission escalation or
   privacy hold bypass. Medical/test results remain in protected channels; no
   sensitive payloads in Telegram/SMS/push or advertising pixels.
8. Record only secret *names*, environment, provenance class (existing,
   generated or provider-issued), outcome, tests, PR/commit, CI, production
   deployment/SHA and any remaining owner-only blocker in the linked issue.

## New public landing pages (optional, subordinate design skill)

For a new public marketing landing page or an explicitly requested marketing redesign, consult `.agents/skills/landing-page-design/SKILL.md`, the MIT-licensed vendored reference from #2224. Apply only ideas compatible with Holistic House's current visual identity, localization, accessibility, honest claims and consent/CRM contracts. Its broad scope must NOT change existing cabinets, Messenger, courses or site-wide UI without an explicit request. For screenshot-driven changes, the existing `visual-to-code-pro` skill remains FIRST.
