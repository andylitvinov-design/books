# Video Studio — Montage Audio / Hypno Effects — 10 November 2026

## Screenshot, route and user decision

Reference: user-provided iPhone screen of the English guest Video Studio on /en/holistic-support/mandala, Montage selected. Preserve the existing six-workspace header, real video hero, warm ivory/green palette and mobile bottom navigation. Third Montage button currently shows Effects and sunlight at 18% intensity. Compare at 320, 354, 390 and 430 CSS px, with EN/RU/ES. The screenshot has iOS chrome; do not compare its status bar pixels with browser content.

The newer owner instruction supersedes the navigation proposed in open PR #3946: keep the top Hypno workspace. Do NOT blindly replace Hypno with a top-level Audio tab. Reconcile its valuable Voice/Meditations changes separately before allowing it to overwrite this layout.

## Approved component mapping

- Montage tabs: Style, Text, Audio, Settings, Story (existing settings and storyboard intact).
- Montage Audio: reuse existing compact licensed first-party background music library, native preview/selection/attach, upload rights and volume controls, with actual music attached to the shared video state. Avoid a second player or audio engine.
- Hypno: preserve Visual and Audio effects subtabs; add a separate third Effects subtab with None, Sunlight, Soft glow, Radiant waves and intensity; keep exclusive tabs.
- Move rather than duplicate the effect picker. The one shared hypnoLight state still feeds the existing Canvas renderer for preview and recorded export.
- Advancing Montage: Style -> Text -> Audio -> Hypno/Effects. Choosing an option is a local state update only; video generation, rights, privacy, consent and credits remain behind the existing Generate Video action.
- No DB, auth, API, paid provider, secret, wallet or external media change.

## Evidence and release gates

Prepared from production source on 10 Nov 2026. Focused source/Canvas tests locally: 21/21 passed on an isolated worktree before its Mac disk became unavailable. New route contract test included for the changed navigation. Mac had insufficient free disk to install modules or run the full Next build; exact published-HEAD GitHub Core and specialist WebKit/browser tests remain mandatory.

Before any LIVE claim: protected checks and native merge into codex/public-book-library, Vercel project codex-public-book-library READY serving holistichouse.vercel.app at the merged or later SHA, real mobile EN/RU/ES navigation and actual music selection + visual overlay in exported MP4. An HTTP 200, PR, CSS or screenshot alone is not E2E evidence.
