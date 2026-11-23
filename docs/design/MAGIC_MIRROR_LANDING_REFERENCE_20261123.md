# Magic Mirror — owner mobile reference alignment · 2026-11-23

Status: **SOURCE CHANGE STAGED FOR PR; LIVE AND PIXEL-LEVEL WEBKIT QA NOT YET VERIFIED**.
Owner supplied two screenshots in this chat. The reference is the **second** screenshot (Russian); current is the **first** (English).
Never commit the original full screenshots: only safe image-area crops from the approved illustration portions are used in the public AVIF strip.

## Page identity and flow
- Native mobile route `/{en,ru,es}/holistic-support/mandala` · Video workspace · first `data-hh-mirror-screen="landing"`, guest or signed-in.
- Existing Scope → canonical Goal → Format (250 / 500 / 2 000 XP quote only) → Topic/Video Studio remains unchanged. All card buttons remain direct taps; no new network calls, no debit, no render or publication.
- Reuse `MandalaMagicMirrorTitle` and `MandalaMagicMirrorGoal`. Do not duplicate the app shell or fixed site dock.
- Three stacked photo-led cards, whole-card touch targets, each with icon, heading, short hint, and green/gold/teal arrow. First carries mint-glowing outline.

## Visual mapping (reference screenshot, rendered 706 × 1536 px)
| Region | Reference physical y interval | Implementation |
| --- | --- | --- |
| Mobile logo, XP pill, profile | ~56–134 | Existing `quickBrandBar`/`HeaderCreditProfile`, landing-scoped header geometry |
| Portrait hero, Magic Mirror, gold arc | ~141–408 | Existing first-party woman portrait, `.title`/heroSwoosh |
| Video therapy for self, lotus | ~414–706 | Existing `data-hh-mirror-enter="me"` with AVIF first third |
| Video for others, gift and heart | ~723–1010 | Existing `data-hh-mirror-enter="others"` with AVIF middle third |
| Video for work, laptop | ~1031–1316 | Existing `data-hh-mirror-enter="work"` with AVIF final third |
| Fixed site bottom dock | ~1350 onward | Preserve outside this module |

The source image strip is 180×540 AVIF, 4,485 B, three approved non-private illustration sections. Each section is sized/cropped with `background-size:100% 300%` to prevent bleeding between cards.

## Accessibility, localization, acceptance
- EN/RU/ES translated headings including the approved Russian self-therapy/work copy.
- 320/354/390/430px responsive text and short iPhone viewports; preserve readable text and vertical scroll rather than fixed screen clipping.
- Existing focus-visible, disabled, gesture handlers, explicit consent/media/MP4 and financial authority remain untouched.
- Source tests verify image header, three cards, mappings, and preserved wizard. Actual screenshots/overlays and tap-based phone/WebKit E2E require a runnable browser. No score or pixel-perfect claim without real device evidence.
- Production release must use protected PR with exact-head CI and **existing hourly Vercel publisher**; verify canonical alias, deployment READY and served source SHA. No manual paid deployment or provider render.

Visual status: **IN REVIEW — real browser screenshots not captured**.
Functional E2E status: **NOT RE-RUN**. Live status: **NOT DEPLOYED** until independent proof.
