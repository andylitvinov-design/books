# Holistic House · Private Client Report · Coastal V2

Approved by product owner: **2026-10-18**  
Source visual direction: **option 2, “Современный и вдохновляющий”** (coastal lighthouse at sunrise).

## Scope

- **Viewer**: private consultation report at `/{locale}/client/session/{shareSelector}`, authorized legacy cabinet session paths, saved session view, and owner preview using `ClientSessionPage`.
- **Not changed**: master report editor, literal author text, prescriptions, client measurements, signed PDF, payments, admin workflows, share/access semantics, or client storage.
- **Excludes** unrelated `/{locale}/report/{assessmentId}` test-result invitations and unrelated PDF document views. Their design is separate.

## Visual contract

1. **Immersive report cover**: deep coastal navy/teal over self-hosted sunrise-and-lighthouse illustration; Holistic House wordmark, practitioner credit, actual localized document title and subtitle.
2. **Compact client/date**: two translucent white identity tiles, carefully reflowing to one column at 320–355px. No hard-coded customer information.
3. **Factual self-rated dynamics**: original two measurements, same numbers and ring calculations, inside accessible light card; no invented target or promised improvement.
4. **Analysis**: complete unaltered practitioner text, generous line height, calm white card.
5. **Recommendation cards**: preserved original remedy image/title, exact authored schedule/fields, larger clear “View remedy” link button.
6. **Materials**: existing authenticated private media and lazy click-to-play YouTube if explicitly selected; no external services called just to render the scenic theme.
7. **Concluding actions**: dark-navy Save to Cabinet primary, light outline additional testing secondary, secure PDF still downloadable.
8. **Print/exports**: existing canonical report layout stays unchanged. Coastal rules are scoped by `data-hh-report-theme="coastal-v2"` under **`@media screen`**.

## Visual tokens

- Navy `#173957`; marine teal `#177F90`; soft sky `#E7F4F6`
- Paper `#FFFEFA`; ink `#173957`; border `#D1E5E8`
- Headings: accessible serif. Body: system sans.
- No external photography/analytics/fonts. Hero art is self-hosted SVG:
  `/images/holistic-house/report-lighthouse-coast.svg`.

## QA checklist

- 320, 355, 375, 390, 430, 768, 1440 px: no horizontal scroll, legible title, client/date, safe-area CTA.
- Client A: full report + 2 factual ratings + remedy + appendix + optional educational video.
- Client B: short report without optional progress or videos; hide unused sections.
- Long Russian and English titles/notes; no clipped words, intact author content.
- Video requires explicit play; original signed PDF and appendix print fully; private media authorization remains unchanged.
- No real client fixtures or personal data in screenshots/tests.
- Inspect PR checks and exact production deployment before claiming LIVE.

## Implementation inventory

- `components/client-session-page.jsx`: opts authorized viewer into coastal theme.
- `components/prescription-document.jsx`: semantically neutral grouping of unchanged report header for cover.
- `components/client-session.module.css`: scoped responsive theme.
- `public/images/holistic-house/report-lighthouse-coast.svg`: original lightweight, local art.
- `tests/client-report-coastal-v2.test.mjs`: source/privacy/print contract.
