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
