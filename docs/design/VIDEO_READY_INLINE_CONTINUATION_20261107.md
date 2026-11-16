# Video Studio · Ready — inline continuation / текстовые практики
**Date:** 2026-11-07
**Screen:** `/{en,ru,es}/holistic-support/mandala` → existing sixth **Ready** tab, after local playback verification (or guest example state).
**Reference:** owner iPhone screenshot (7 November 2026); the three bottom cards below Save/Download/Telegram/My House.
**Component:** `components/mandala-video-ready.tsx` and its existing CSS module. No separate route, second editor or duplicate backend.

## UX and visual specification

- Preserve the 16:9 ready video and its caption, save/Telegram/My House actions, protections and user-triggered sign-in gate. They must remain visible while any continuation is expanded.
- The three existing full-width mobile cards keep their original image/icon/title/subtitle and 44px+ touch area. Active card uses light teal surface and visible selected border; **one** card can be expanded at a time.
- Clicking **Personal meditation**, **Personal ritual** or **8-session journey** changes only `activeOffer`, not the route or Studio tab; a localized explanation and the selected goal appear in one naturally flowing panel immediately below the card group, followed by one primary **Generate / Сгенерировать / Generar** button.
- No auto-dialog, no automatic model call or render. Before the Generate click no personal scripts are shown. After a successful click, text appears under the same button, remains in-page, and may be copied.
- Meditation: use the existing versioned local guided-text writer for a gentle five-minute script. Narrated media and audio generation remain separate, explicit advanced options, not implied by a text result.
- Ritual: use existing `selectResourcePractice` with urgent-language stop conditions, optional collapsed time/place/action/phrase settings; Generate reveals the three steps and integration guidance, and offers a revision.
- 8-session journey: use existing `buildPersonalImageryCourse` for **eight actual text scripts**, with a disclosure per session, first session initially expanded; optional advanced planner only after scripts. Script ≠ eight rendered videos, paid course or medical treatment.
- Preserve no persistence and no sensitive information sent to external provider. The chosen focus stays client-side; no new Supabase, CRM, payment, Telegram or notification writes. For urgent goals, return the existing safety response rather than a generated ritual.
- EN/RU/ES strings; mobile reference widths 320 / 354 / 390 / 430 CSS px. Panel width auto, no horizontal scroll or footer overlay. Keyboard/VoiceOver: buttons expose `aria-expanded`, panel uses region label, visible focus ring, reduced-motion-safe scroll.

## Acceptance: tests and live verification

- Focused `tests/mandala-video-ready.test.mjs` checks the unchanged save/Telegram gate plus all three card handlers, in-page panel, localized text generation and actual local writer results across EN/RU/ES; urgent resource prompts remain blocked.
- Locally check source diff, lint, TypeScript and relevant visual/browser behavior. On PR HEAD, run real Core, specialist/mobile/WebKit and `hh-merge-check`, rather than assuming static source assertions equal browser QA.
- Production acceptance is **independent**: required exact-HEAD CI success → protected merge into `codex/public-book-library` → Vercel project `prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b` READY with matching deployed commit → canonical `https://holistichouse.vercel.app` guest/authenticated click-based verification. Video save, bot provider delivery and signed-in uploads were not changed and must not be inferred from this task.
