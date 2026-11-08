# PsiMaster RU Academy discovery audit — 2026-10-23

## Source and reconciliation

- Historical source: https://psimaster.net/
- Native Academy: https://holistichouse.vercel.app/ru/academy
- Prior import already stored 147 classified PsiMaster public taxonomy entries; **22** source-backed curated programmes were published as native Academy records.
- 7 logical legacy video-course families, **45** source-linked YouTube lesson records, are preserved.
- These are not 147 standalone courses: the other taxonomy items include library articles, services, navigation, supplements and canonical duplicates.
- One taxonomy item ("Курс Гипнотерапия Отношений", term 12434) has no trustworthy retrieved body and remains unpublished; do not invent a course.
- Reiki Yggdrasil canonical pages remain primary; do not clone the existing curriculum, videos, private progress or sessions.

## UX delivery

The main Academy discovery view now gets **22 source-backed RU PsiMaster course links** and **7 legacy video course links** directly from the existing manifests, with no new database records or cloned pages.

- A top quick path jumps straight to the compact PsiMaster directory.
- Eight editorially prioritized programme buttons are visible initially; “Показать все курсы (22)” expands the complete list.
- Video-course buttons are visible separately, each linking to its existing native Holistic House Academy page.
- The shared Academy search matches all 22 legacy titles and all seven video-course titles (not just the eight featured modern programmes).
- Historical/archive labels keep legacy descriptions separate from actively enrollable courses. Old prices, medical claims, and enrollment availability are **not** implied.
- EN/ES controls have localized UI text; RU course content remains canonical, with existing English translations untouched.
- 320–430 px mobile: one-column links and two-column quick-path controls.

## Validation and release

Source-level checks: `node --test tests/academy-psimaster-buttons.test.mjs`.
Check TypeScript / lint / Next build and production SHA before declaring live.
After deployment, verify `/ru/academy`, buttons to several native programmes and all video family pages. Do not infer delivery from HTTP 200 alone.

**Status**: Code proposed in PR; production verification pending until build, merge and Vercel READY readback.
