# Tools for screenshot → working UI

## Core rule: live page beats guessing from a picture

When the approved design is an existing live page, inspect the **real route and DOM** in a browser before coding. Collect URL/query, role, selected tab, flow step, element rectangles, computed CSS and variables, font metrics, assets/background images, overflow, and link destinations. A screenshot contains appearance, not all of this behavior. Never compare two different view types (dashboard and service editor) as if they should be pixel-identical.

Specific Holistic House mapping: the original **Кабинет практика** dashboard lives at /ru/practice; **Мои услуги** listing lives at /ru/app/practice?panel=services; the 3-step service editor is opened explicitly by /ru/app/practice?panel=services&create=1&starter=session. A post-OAuth redirect directly to the editor is a flow/navigation problem, NOT a failed CSS clone. Track it in the already existing PR https://github.com/andylitvinov-design/books/pull/2498 and issue https://github.com/andylitvinov-design/books/issues/55. Do not duplicate the fix.

## Preferred free / existing stack

**1. Reuse Playwright in this repository, mandatory for browser acceptance.**

The existing .github/workflows/hh-support-mobile-mock-browser.yml already installs Playwright Chromium and WebKit. Adapt its browser script pattern for the exact requested page; test CSS widths 320, 354, 390 and 430, plus desktop. Capture *actual rendered screenshots*, inspect browser overflow and verify real button navigation. Stable synthetic snapshots can use Playwright Test toHaveScreenshot; the same OS/browser/viewport/fonts/data/crop must be used to compare.

Official: https://playwright.dev/docs/test-snapshots

**2. Microsoft Playwright MCP, useful for agent-driven browser iteration.**

Official https://github.com/microsoft/playwright-mcp . It supports navigation, resizing, accessibility snapshots, element screenshots, console/network inspection and interaction. Connect it to the coding agent/IDE only with suitable permissions. It is NOT required to run the already existing CI browser tests, and adding this document does NOT install it. Official tools: https://playwright.dev/mcp/capabilities and https://playwright.dev/mcp/tools/screenshots .

**3. Chrome DevTools MCP, useful for extracting exact CSS from a live reference.**

Official https://github.com/ChromeDevTools/chrome-devtools-mcp and https://developer.chrome.com/docs/devtools/agents/get-started . Use its read-only DOM, computed styles, CSS cascade, network and console diagnostics on the live Holistic House screen. No need to hand-guess colors, font sizes, image positioning or missing assets. Do not attach a personal authenticated Chrome profile to remote debugging without explicit approval; never expose cookies, credentials, client health/test data or browser network secrets in public CI/PR logs.

**4. Figma MCP, optional when the approved source is a Figma file.**

Official https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/ . Use get_design_context plus get_screenshot and approved assets/variables if a native Figma file is actually supplied. If the original is a living web page, inspect the original page directly instead of creating a needless new Figma layout. Do not enable paid Figma seats or features without approval.

**5. The visual difference script in this skill branch.**

After confirming both screenshots are from the same route/state/view, generate visual overlay, diff and diagnostics:

    node scripts/compare-ui-screenshots.mjs \
      --reference /tmp/approved.png \
      --actual /tmp/current.png \
      --reference-view '/ru/practice|signed-in|dashboard' \
      --actual-view '/ru/practice|signed-in|dashboard' \
      --out artifacts/visual-to-code/practice

If actual view is the My Services editor, **the tool must reject the mismatch before pixel comparison**. A difference percentage without exact view identity, matched screenshot crop/DPR and inspected layout landmarks does not prove anything. Browser toolbar, clock, keyboard, battery and address bar are not part of the web page.

## Safety and installation

- Do not download random third-party screenshot-to-code agents with browser/filesystem permissions. Review source, licenses and permissions; pin reviewed versions in project-specific IDE config.
- Browser MCP connections are IDE/user-environment settings, not deployed site features. Never claim they are installed merely because setup docs exist in GitHub.
- No new paid image-to-code subscriptions, APIs, render credits or unnecessary Vercel builds.
- Remote Desktop Commander being offline/quota-blocked is a real operational blocker for installing software on the owner's Mac; avoid repeated failed attempts.
- Require a real same-view screenshot and real guest/signed-in workflows before accepting visual or functional E2E. For private paths, use safe synthetic browser fixtures.
