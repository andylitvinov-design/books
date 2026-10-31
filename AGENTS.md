# Holistic House: screenshot-driven UI work

When the owner provides a screenshot, reference image, Figma export, or mockup and asks to create, rebuild, redesign, or correct any page, **read and follow .agents/skills/visual-to-code-pro/SKILL.md before changing UI code**. Its FIRST gate is page identity: reference and actual must share the same route/query intent, role, auth state and dashboard/editor view type. A service editor screenshot is not a visually failed practitioner dashboard; fix wrong OAuth/automatic navigation before comparing pixels. Use its reference specification, preserve working APIs/auth/data, perform rendered screenshot comparison, and never call CSS/unit tests alone a visual match.

The canonical website is https://holistichouse.vercel.app. The GitHub default branch codex/bootstrap-books is **not** automatically production. Production previously used codex/public-book-library: verify Vercel project, source branch, READY deployment, SHA and canonical domain every time.

Keep existing pages/components instead of adding duplicates. Preserve EN/RU/ES routes, signed-in navigation, private data, CSP nonce, CRM, protected media, real service IDs, consent and existing E2E contracts. Never claim real delivery, booking, payment, OAuth, or photo upload from a mock, a screenshot, HTTP 200 or CI alone. Use synthetic screenshots in public artifacts and respect privacy.

## Automatic visual QA tool order

For each owner screenshot, URL or Figma-based page design request, **do not ask the owner to name tools**. Inspect the correct canonical route and auth/view state first; then invoke the tools that are actually connected:

1. **Existing live page as reference:** use Chrome DevTools MCP for read-only DOM, CSS, asset and geometry inspection; if unavailable, use the existing authorized browser/Playwright CI approach and clearly state the limitation.
2. **Figma source link supplied:** use Figma MCP for design context/variables/screenshot (only with an actual Figma source). Do not insert Figma into an image-only workflow or invent access to a file.
3. **Rendered implementation:** use Playwright MCP interactively where connected, plus the GitHub Actions Playwright Chromium/WebKit acceptance workflow. Execute real click/navigation and responsive screenshot tests, then calculate overlay/difference only on the same route/state/viewport. See docs/design/VISUAL_MCP_AUTO_QA.md.
4. The first deployed screen can NEVER be accepted based solely on text/CSS contracts, screenshots of a different view, HTTP 200, CI green, or successful OAuth initiation. State separate evidence for visual fidelity, real account E2E, and Vercel READY/SHA.

Verified tool versions and project setup are declared in .codex/config.toml and .vscode/mcp.json, but **repository files do not install MCPs into ChatGPT nor grant browser/IDE permissions**. Only claim tool availability after successful tool calls. A failed or blocked MCP connection is not a reason to skip the independent GitHub browser workflow or to fabricate visual acceptance.

## PR delivery fast lane (Work / Chat / DOT)

For any PR repair, CI triage or merge into the canonical production branch, follow `docs/operations/PR_FAST_LANE_20261029.md`: deduplicate ownership by repo#PR, spend most effort on an actual fix/merge, inspect *exact-head* checks and failed job logs, keep security/privacy/RLS/payment gates, and report own merges separately from other agents' actions. The single core `release-ready` check is necessary but never replaces relevant specialist tests, approval or post-merge Vercel/live verification. GitHub default branch is **not** automatically production.

## CI push batching for Codex / Work agents

On each independently owned PR, prepare one coherent repair locally, run focused source/contract/lint tests **before** pushing, then make preferably one atomic, meaningful push per verified iteration. Avoid pushing every interim editor change, failed test experiment, partial rewrite or no-op commit: each push can trigger dozens of expensive GitHub workflows. Let current exact-head specialist jobs complete unless a verified new root cause, necessary correction or urgent security fix justifies a new commit. If the same source error recurs, read actual job logs first; do not rerun or change SHA merely to try again.

Draft PRs may skip heavy browser matrices; transitioning to Ready must run **all applicable real** browser, privacy, RLS, auth, billing and release gates on the exact HEAD. This is batching per PR, **not** a cap/freeze on independent new PRs or a delay of P0 fixes. Never bypass required green checks, Vercel production SHA verification, review or owner leases.
