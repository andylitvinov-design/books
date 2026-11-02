# Public source-image finishing audit — 2026-10-16

Live post-merge #733 HTML/asset inspection showed 0 `/_next/image` URLs on ES About, Tantra Reiki free-initiation and Tantra Reiki overview, and on the Yggdrasil free-initiation landing. Three remaining small verified assets are resolved in this pass:

1. EN About's second, archived Psychic Alchemy intro video poster still used the **same 2 MB Andy PNG** through runtime Next transforms even though the primary portrait had been migrated. Replaced this exact component with the previously shipped responsive pre-generated `StaticPortrait` without changing the approved Digital Twin video, click-to-play, transcript or voice.
2. The actual Yggdrasil `/basic-course` route uses `YggdrasilModuleLandingPage` (not just `/basic-course/description`). Its module-image template also needed `unoptimized`. All seven module source images are pinned under `public/academy/reiki-yggdrasil/source` and verified in tests to be <200 KB.
3. The `/en/books` section illustration `books-library.webp` is 146,898 bytes pre-compressed, safe to serve directly. Dynamically redirected book covers `/media/.../post_*.jpg` **remain optimized** because their source sizes are not independently verified.

HTML `srcset` candidate counts are NOT counts of actual network transfers or billed transformations. This change is narrowly scoped and does not use a global `images.unoptimized` setting.

No payment/credential/client media publishing changes. Verify source contracts, production build and browser before rollout.
