# Constellations / Business / Free Express — shared public video

Owner instruction 2026-10-23: use the existing YouTube live recording
<https://www.youtube.com/watch?v=sfVFOQNr2qk> for the landing pages of
**systemic constellations**, **business constellations**, and **free express
situation review / diagnosis**. Do not generate or upload another copy.

## Existing routes (EN / RU / ES)

1. `/{locale}/services/systemic-constellations` — personal constellation landing.
2. `/{locale}/services/business-consulting` — includes the existing paid Business Mapping & Goal Activation / constellation service (no duplicate offer or route).
3. `/{locale}/services/free-situation-review` — existing free written express situation-review landing (not clinical diagnosis).

Personal and business landings reuse `ServiceVideoShowcase` → `SiteVideoPlayer`; the free-review page places the same `SiteVideoPlayer` directly in the **first hero scene**. All three read the
`constellation-case` topic and **one** YouTube ID stored in
`data/service-video-library.ts`. The owner's public portrait serves as the
local placeholder. Iframe created only on user Play; YouTube watch link remains
available if embedding fails. Existing EN/RU/ES method introductions elsewhere
are not overridden. No billing, lead, CRM, or personal-record handling changes.

## Editorial limits and acceptance

- The source is owner-provided. Public YouTube readback returns the video title
  **Business Constellations** and a canonical iframe URL. The YouTube page
  language is English, but the *spoken audio language* and captions have not
  been independently verified. The source is tentatively tagged EN for UI;
  correct the tag if a real playback check shows otherwise. No transcript,
  duration, clinical evidence or subtitles are invented.
- Metadata offers an embed URL, but the standalone third-party embed fetch
  returned YouTube player error 153 (likely no Referer in the fetch client),
  not a verified website playback. Do not claim embed E2E until guest Play
  works on production and iPhone.
- Verify EN/RU/ES page access and link to exact ID, click-to-load inside the
  page, no autoplay on page load, poster/CTA layout at 320/390/430px.
- Check PR tests/typecheck/lint/build, merge into actual production branch,
  verify Vercel READY + exact git SHA + canonical domain before closure.
- Privacy: viewer chooses to play external YouTube. Do not expose client
  report content or attach tracking parameters to the video URL.

Tracking: [books #990](https://github.com/andylitvinov-design/books/issues/990).

## 24 Oct compact mobile redesign
- The free-review hero starts with the same YouTube video, 16:9 poster, and direct source link before any long explanation; no duplicate video further down.
- Mobile 320–430px: brief localized message, single 44px-class CTA, detailed content in following compact scenes, and shorter-phone CSS adaptation.
- Existing consented CRM capture remains unchanged; no new renderer or upload; iPhone Play and external provider playback still need real live QA.
