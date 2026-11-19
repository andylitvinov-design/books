# Support · compact three-offer mobile cards · owner correction · 18 November 2026

## Same-screen identity
Canonical route: \`/{en,ru,es}/services\`, guest iPhone Safari public Support.
Owner reference: attached iPhone screenshot (IMG_0704.jpeg) in the owner's 18 November conversation (706×1536 physical pixels with iOS status bar, embedded browser toolbar and bottom navigation). The captured content is scrolled to the **Personal consultation** section: heading/lead, Express, Extended and Personal formats. This screenshot is the **oversized existing state**, not an approved pixel-identical destination.

## Owner-requested target
The heading ("Личная консультация / Personal consultation / Consulta personal") and all **three collapsed offers** should be visible in a single phone content view at ~353–390 CSS px, without small unreadable type. No text/price/actions outside the owning card.

- Section header: warm-ivory editorial row with emerald border, compact serif title, 12px subline and a localized "3 options" badge.
- Each collapsed card: ~139–165 CSS px tall, soft 17px radius, existing genuine optimized photograph **left**; verified/free/quote price at **upper right**, 16–18px serif title and concise 12–12.5px description **right**, followed immediately by two 44px touch-safe Details / Order controls under the description **in that same right column**.
- Details or Order is explicitly opened. Expansion reveals real descriptive paragraph + first-party link or both WhatsApp/Telegram choices **across the full card width, beneath photo and controls**. The photo, visible title and price remain, and expansion may scroll naturally; three-fit applies to collapsed state.
- Existing other ten three-offer Support groups adopt the same compact card rhythm without changing their published offer IDs, destinations, prices, consent or messenger handlers. The 14 catalogue section links and seven-tab fixed dock remain.
- Preserve RU/EN/ES. 320px may need more natural wrapping. Desktop unaffected.

## Evidence and release
Target source: \`components/services-personal-consultation-mobile.{tsx,module.css}\`, \`components/services-unified-catalog.module.css\`, \`components/services-three-visible-options.module.css\`. Existing browser acceptance should render screenshots and measure header + three collapsed tile heights at 390, left/right alignment, two touch controls, post-click messenger row and preserved photo. Also test 320/360/430, WebKit, TypeScript/build and domain routes. Owner screenshot includes browser UI, so no fabricated pixel-error score: reference must be cropped and compared to the same user state and viewport before a fidelity claim.

One protected PR, exact-head CI, auto-merge and existing hourly Vercel release only. Do not create paid preview builds, provider requests or bypass public consent, bookability or security.
