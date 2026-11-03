# Holistic House · Tantra Reiki Level 1 · Approved three-choice offer design

**Approved:** 2026-10-16  
**Page:** https://holistichouse.vercel.app/en/academy/reiki/tantra-reiki/free-initiation  
**Original approved visual (Google Drive master):** https://drive.google.com/file/d/1DuoBy_uaon643wgHjERObsE1I2pGzm03/view

## Design brief

Recreate the approved pastel offer cards, staying within Holistic House’s existing elegant serif headlines, navy and burgundy accents, muted beige background and rounded corners. Respect the owner’s preference for three choices visible together in one mobile screen whenever viewport size allows; avoid tall empty padding. Use three compact cards stacked on a narrow phone, three columns on large desktop. Each card has an icon, brief overline, readable title and explanation, a clear price/duration pill and one full-width CTA.

| Option | Duration and price | Action |
| --- | --- | --- |
| Free guided introductory request | €0 | Scroll to the five-step free guide |
| Personal distance Level 1 initiation | €50 / 30 minutes per level | Pre-filled WhatsApp enquiry |
| Personal session + Level 1 initiation | €100 / 60 minutes | Distinct pre-filled WhatsApp enquiry |

**English third-offer copy:** “We explore your situation and check for solutions. Includes your Level 1 initiation.”

## Visual direction

- Free: gentle blush, burgundy icon and action.
- Personal initiation: light blue, deep navy icon and action.
- Personal session + initiation: warm cream/sand, copper icon and action.
- Keep price badges at the upper-right of each card; minimize unused vertical space.
- Use an airy floral motif in the section header on desktop, omit it on mobile to maintain a compact view.
- Preserve the existing booking/availability caveat: merely studying or submitting answers does not grant an initiation.
- English, Russian and Spanish must all contain the same three actions.
- WhatsApp opens with a prepared message; there is no name/email field, login gate or automatic submission.

## Source of implementation

- `components/tantra-free-initiation.tsx`
- `components/tantra-free-initiation.module.css`
- `components/tantra-initiation-form.tsx`
- `tests/tantra-free-initiation.test.mjs`

The image is the design reference, not an image to display as a background in place of real responsive HTML. Use accessible native links and text. Other Reiki programme pages stay unchanged.

## Approved amendment — 2026-10-16

- Personal session + Level 1 initiation: **€100 / 60 min** (was €75 / 45 min); update the offer card and all EN/RU/ES WhatsApp handoffs consistently. The separate initiation-only offer remains €50 / 30 min.
- The seven study questions are preserved but presented inside a native `<details>` element without an `open` attribute, so questions are initially **collapsed** and can be opened by mouse, touch or keyboard.
- The folded header reads “7 questions to get your free initiation” in English, with corresponding RU/ES translations and a compact mobile-friendly chevron control.
