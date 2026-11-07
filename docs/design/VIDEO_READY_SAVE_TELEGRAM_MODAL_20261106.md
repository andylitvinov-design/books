# Video Studio · Ready save gate — approved modal
**Design reference (owner approved):** [Google Drive JPG](https://drive.google.com/file/d/1KLhpmtTZbrZVLFWqn7Jv-2ZzZWGiu9xo/view) · 6 Nov 2026. Original hi-res generated mock was preserved on Drive. The production decorative portrait is a rights-safe cropped derivative of that same approved artwork (not a person claimed to be the owner).

## Page identity and ownership
- Route `/{ru,en,es}/holistic-support/mandala`, Video Studio → final **Ready** tab, guest or signed-in, **existing** verified local video/MP4.
- Owned by `components/mandala-video-ready.tsx` and `mandala-video-ready.module.css`. Keep the single existing `MandalaVideoDelivery`, session refresh and protected private-video API. No second video editor, Telegram bot, Cloud renderer, CRM or login flow.
- Open **only** after explicit user selection of Save, Download, Telegram or My House. Never auto-mount or auto-open the dialog during navigation, login, page load or return.
- Leave playable video in the same original tab: Google/My House sign-in opens separately. Close/cancel restores the local Blob and original scroll/focus.

## Copy and hierarchy (EN base; RU/ES mirrors)
- Warm ivory surface `#FFFCF7`, forest title `#143D3A`, sunrise portrait from the approved mock, serif hero title, soft gold underline, single emerald CTA.
- RU headline: **Сохраните видео бесплатно**. Lead: **Видео уже готово. Войдите, чтобы сохранить его в «Моих видео», скачать или отправить себе в Telegram.**
- Four concise benefit tiles: **В Мои видео** · **Скачать на телефон** · **Отправить в Telegram** · **Медитация или курс**. 2×2 for phones.
- Guest CTA: **Войти в Мой дом**; helper: **Сначала войдите в «Мой дом». Откроется новая вкладка, ваше видео останется здесь. Затем проверьте вход.**
- After verified sign-in, Telegram link CTA: **Получить ссылку в Telegram** → signed account's existing `/api/app/personal-videos/delivery` `action=connect` → validated 32-character token URL. Then **Открыть Telegram · нажать «Старт»**, and **Проверить Telegram**.
- Explicit caveat: **«Старт» привязывает бота к вашему кабинету, но не отправляет и не сохраняет видео автоматически.** The actual owner-selected Save/Download/Send continues via the existing delivery chooser with verification and server consent.
- Alternative **Продолжить сохранение** to use My Videos or download when Telegram unavailable. Footer: **Бесплатно в рамках лимитов · Только с согласия · Приватно**.
- Do not label Telegram Start as website login: Telegram account linkage is server-bound to an already verified My House account. No guessed bot username or challenge, no website OAuth emulation.

## Layout / interaction contract
- Mobile widths 320/354/390/430px; dialog max width 480px, max height `100dvh-22px`, inner scrolling on very short screens, safe-area padding. No horizontal overflow, covered CTA or bottom bar overlap.
- One dialog `role=dialog`, `aria-modal=true`, descriptive title, visible × close, Escape/backdrop close, focus trap and restore, large 44px+ controls, reduced-motion support. Underlying workspace is still preserved and visible through the dim overlay.
- Offline or linking feature disabled: honest inline error and cabinet fallback, no false success. Display delivery confirmation only from existing private API/provider results; provider `accepted` is not device receipt.
- The photo is a static compressed original decorative visual, no tracking pixels or external assets. Only an explicit consented action uploads a private MP4, within existing cloud-video limits (MP4 <= 12MB; quota/availability enforced server-side).
- `Goal → Ideas → Montage → Hypno → PRO → Ready` remains exactly six destinations.

## QA and delivery
- Source and CI tests: `tests/mandala-video-ready.test.mjs`, existing Mandala/Core/Guard and specialist WebKit acceptance.
- Real browser QA should capture the same Ready guest state and click Save, ensure dialog, close/escape/focus, Google sign-in in another tab, return session check and Telegram Start link, at 320–430px RU/EN/ES.
- Provider receipt, physical iPhone downloaded media and actually saved private library record require authenticated live E2E; guest screenshots and HTTP 200 are insufficient.
- Release only after protected PR checks, merge, exact SHA Vercel READY, domain alias and click-based acceptance. No paid service toggles or mass sends.
