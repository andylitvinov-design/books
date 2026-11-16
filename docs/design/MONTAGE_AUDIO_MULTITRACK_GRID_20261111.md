# Holistic House · Montage Audio: multitrack card grid (2026-11-11)

## Reference identity
- Owner-approved ChatGPT-generated mobile mockup (11 November 2026), EN locale.
- Canonical route: /en/holistic-support/mandala and RU/ES mirrors.
- State: Video Studio / Montage / Audio, guest or signed-in; shared film player and unified site footer. Do not compare against a different Ideas or Hypno page.
- Reference visual: warm ivory canvas, white rounded task card, emerald selections, nature photo cards, category chips, compact volume and two bottom actions. Same preview with Intro/My video rail as Style.

## Implementation contract
1. On the main Audio screen, show five existing reviewed performance-recording masters plus a sixth local file upload tile, arranged in three columns and two rows at normal phone width. The images are licensed first-party film posters, decorative only, not album covers.
2. Choosing cards immediately adds/removes from the one existing AttachedAudio kind=presets mixer, allowing 1–3 distinct tracks. A fourth card tap shows a bound warning instead of dropping a prior selection. Separate Play previews without attachment.
3. The old Music library / My audio segmented switch is removed. Secondary Browse preserves existing deep library, voice controls and other working capabilities; primary upload uses the platform file picker and existing file/rights validation.
4. Explicit permission is required to attach and export an uploaded file. No auto-render, external storage upload, charge, or new voice provider from any selection.
5. Affirmations opens the existing Montage Text editor; bottom buttons are Add Affirmations and Create Video, the latter retaining the original createQuickVideo credit/export/consent/ownership checks.
6. Preserve EN/RU/ES, focus, status announcement, Safari gesture audio, one native player and one renderer. Approved breakpoints: 320 / 354 / 390 / 430 px.

## Tests and release acceptance
- Focused source/audio mix contracts + updated real Chromium/macOS WebKit user-click script, TypeScript, lint, Next build, and mandated specialist/merge guard on exact PR HEAD.
- Check same-state screenshots for 320, 354, 390 and 430 px and verify CTAs above fixed bottom navigation; compare with approved mock, recognizing cropped phone chrome and dynamic photo.
- Confirm selecting two tracks changes attached state and resulting MP4 audio; preview is separate; no automatic export; silent resets; file upload without rights blocks; authorized file attaches.
- READY production deployment with exact served SHA and canonical URL, live iPhone behavior independently. Do not equate PR, green static test, READY or HTTP 200 with working encoded audio.

## Known scope limit
Exactly five eligible curated third-party recorded masters exist in the audited manifest. This design does not fabricate an expanded recording library or claim that the older first-party synthetic tracks have been purged. Their quality/rightholder review remains an independently scoped catalog task. No provider spend or new scheduled workflow.
