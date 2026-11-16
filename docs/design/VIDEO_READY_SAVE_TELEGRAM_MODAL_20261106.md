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


## Post-release defect and remediation — 7 Nov 2026 · private MP4 larger than 6 MiB

**Observed facts (read-only production evidence):**
- The approved Ready modal is merged and Vercel READY, but authentic save completion is not proved by a successful deployment.
- Both existing production options \`HH_PERSONAL_VIDEO_CLOUD_SAVE_ENABLED\` and \`HH_VIDEO_TELEGRAM_DELIVERY_ENABLED\` are explicitly \`true\`; no additional paid provider or feature flag is required.
- The owner-scoped private bucket is not public. Production contains one ~9.6 MB \`personal_videos\` row in \`pending\`, no \`ready\` records and no \`personal_video_telegram_dispatch\` entries. The pending row has no corresponding stored object.
- Supabase Storage observed one successful **signed upload URL issuance** at the matching period but no subsequent file-chunk/PUT event in the observed storage log window. This narrows the gap to client-side upload initiation/interruption, not a verified provider send or a missing public app page. We do not infer which specific iOS/browser failure occurred.
- Supabase's current guidance recommends TUS resumable transfers for files exceeding 6 MB or unstable mobile networks; existing code uses one \`uploadToSignedUrl\` request for every video.

**Code remediation (no new paid services):**
- Reuse the existing signed \`personal-videos\` upload token, authorized HTTP session, consent event and private object key. For MP4s >6 MiB send TUS \`POST\` + 6 MiB \`PATCH\` chunks with \`x-signature\`. Validate the Supabase Storage response \`Location\` origin before any token-bearing request. Resume the prior upload URL with \`HEAD\` offset in the same browser session after an interrupted transfer; never use a remote third-party host.
- Keep the proven \`uploadToSignedUrl\` SDK path for small MP4s. Use one shared client upload helper for Ready and My Videos; no duplicate implementation or account/CRM objects.
- Keep the original pending server reservation and original signed token across user-triggered retries of **the same local file** until token expiry; never reserve a new consent/quota slot merely because the phone lost connection. No localStorage/sessionStorage or private payload in logs. At expiry advise deletion of the unfinished record in My Videos through the existing owner-authenticated DELETE flow.
- Show integer progress and a specific resumable retry message in RU/EN/ES. The "saved" state appears only after the original server checks length, MIME and MP4 \`ftyp\` and changes the existing row to \`ready\`.
- Telegram delivery remains a separate single explicit API action. Do not automatically retry a Telegram provider send after a possible unknown outcome. Keep the real provider status distinct from actual user receipt.
- No schema migration, new paid API, bot activation, mass sends, browser analytics or secret exposure.

**Acceptance:**
- Node mock TUS tests cover >6 MiB two-chunk upload, one-reservation retry after interruption, redirect/origin token safety and invalid MP4.
- Production CI: Mandala focused tests; Core lint/types/build; Specialist and guarded merge; Vercel READY exact SHA/domain; RU/EN/ES.
- Real authenticated iPhone end-to-end test still necessary to certify Supabase object \`ready\`, My Videos playback and Telegram dispatch/provider receipt. A unit mock, HEAD, HTTP 200 or a merged PR does not certify that user-level result.
