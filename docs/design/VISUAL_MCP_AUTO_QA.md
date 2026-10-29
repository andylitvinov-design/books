# Holistic House: one-time browser MCP setup (Codex / WebStorm / VS Code)

## What is automatic

- Root AGENTS.md instructs agents to use Visual-to-Code Pro for owner-supplied screenshots/live-page references. Screen identity (route, account state, dashboard/editor) is the first gate.
- The project file .codex/config.toml declares pinned official Playwright MCP v0.0.83, Chrome DevTools MCP v1.12.0 and optional remote Figma MCP. Codex only loads project settings after the user trusts this project.
- .vscode/mcp.json declares equivalent servers for VS Code Agent mode. VS Code may ask to trust/start servers; Figma requires OAuth.
- Independent, secret-free GitHub Actions in .github/workflows/practice-visual-browser.yml render Practice with Playwright Chromium and WebKit at mobile widths and capture synthetic screenshots and geometry. **CI does not require MCP or the owner's Mac.**
- No MCP server is installed inside the Vercel production app. Browser tools belong to a trusted development environment, not a public web page.

## WebStorm / JetBrains AI Assistant (owner's local IDE)

WebStorm does not automatically read .vscode/mcp.json. Its AI Assistant can connect MCP servers through Settings → Tools → AI Assistant → Model Context Protocol (MCP) → Add. Choose project-level settings, Standard I/O transport, and add the following JSON:

~~~json
{
  "mcpServers": {
    "holistic-playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@0.0.83", "--isolated", "--headless", "--block-service-workers"]
    },
    "holistic-chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@1.12.0", "--isolated", "--headless", "--no-usage-statistics", "--no-performance-crux"]
    }
  }
}
~~~

For Figma, add a Streamable HTTP project server using the JSON below and complete the Figma OAuth prompt **only if** a Figma source file is used.

~~~json
{"mcpServers":{"figma":{"url":"https://mcp.figma.com/mcp"}}}
~~~

Click Apply and verify each server reports connected. Enable Automatically enable new and changed MCP servers only after reviewing the project's browser access. Browser tools are used by the AI Assistant agent only when its mode and permissions permit. Do not enable brave mode/unconfirmed shell execution, connect a real personal browser profile, or copy private CRM data to the agent.

If running Codex in WebStorm, project .codex/config.toml should load after trust. Check with the command codex mcp list in the project terminal. Approve any first-time package install and Figma OAuth when asked. If remote desktop usage is exhausted, do not retry it; GitHub Actions visual checks still work server-side.

Official:
- JetBrains https://www.jetbrains.com/help/ai-assistant/mcp.html
- WebStorm IDE MCP server (separate direction) https://www.jetbrains.com/help/webstorm/mcp-server.html
- Playwright MCP https://playwright.dev/mcp/installation
- Chrome DevTools MCP https://github.com/ChromeDevTools/chrome-devtools-mcp
- Figma https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/

## Automatic quality process for screenshot-specified pages

1. Approved **live page**: inspect DOM/box rectangles/computed CSS, variables, fonts, images, route and button destinations with Chrome DevTools MCP or another authorized browser. Do not infer the whole layout only from pixels.
2. **Figma file**: use Figma design context/variables/assets when authorized. An iPhone screenshot does not require Figma or paid subscriptions.
3. Implement the existing canonical components, preserving EN/RU/ES, private account scope, CSP, API, client/practitioner data, redirect semantics and real buttons. No duplicate mock screens.
4. Playwright screenshots at matching browser state, viewport, DPR and crop. Generate overlay/diff. If views differ (Practice dashboard versus My Services editor), block pixel comparisons and fix navigation before styling.
5. PR acceptance: Chromium/WebKit screenshots, responsive geometry, synthetic functional tests, unit/lint/types/build and safe CI. Real signed-in Google/save/upload/payment remain separate authorized E2E.
6. Report separate statuses for source, visual browser, real interactions, production READY/SHA and provider delivery. No false pixel-perfect/live claims.

The owner's October 28 iPhone Practice reference is represented by non-sensitive, approximate landmarks in scripts/fixtures/practice-approved-reference-20261028.json. The original page is /ru/practice, not the separate /ru/app/practice?panel=services&create=1&starter=session editor.
