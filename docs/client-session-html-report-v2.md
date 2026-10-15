# Holistic House — Client HTML prescription / session page, v2

Implemented by PR #601 on `andylitvinov-design/books` for issue #585. The feature remains off in production until secure storage credentials and client acceptance are verified.

## Goal
A person arriving via a session-only invitation should immediately know: what was recommended, where the personal audio is, how the approved instructions were written, and where to find more context. The page is a mobile-first HTML report rather than a flat PDF reader.

## Client layout

1. Header: client full name (from authorized client or the signed-off prescription record), title and consultation date. The HTML document metadata remains generic and does not expose the name.
2. Personal audio or personal video; click-to-play private player; manual transcript collapsible.
3. Appointment and administration summary drawn from the verified approved consultation document; only fields authored by the practitioner. Show the remote-work indicator only when `includeDistanceHomeopathy === true`. If no instructions are recorded, explicitly ask the client to clarify rather than invent doses.
4. Each assigned homeopathic remedy or Bach essence has its own native `<details>` card. Name/potency and a compact practitioner-authored how-to in summary, with purpose, amount, frequency, duration, sequence and instructions on expansion. A general library profile link, if present, is not medical advice.
5. Genuine PDF download through the established session-scoped report endpoint; no fake HTML export.
6. Optional video explicitly tagged `role: instruction` by the practitioner. Private media only; no default stock avatar, autoplay or unapproved instruction video.
7. Additional practitioner-authored recommendations, up to three takeaways, up to three practical exercises; no fake completion state.
8. Extra uploaded PDF/audio/video and up to eight **public, vetted** HTTPS educational resources/meditations. Private documents must use private upload, not a Drive/YouTube share URL.

## Owner workflow
At `/admin/clients/{clientId}/sessions/{sessionId}` choose verified report, write first next step and notes, attach audio/video/PDF (or from consultation report editor), assign the role for each media item, paste only public educational resource URLs, preview and press Publish. Edits become visible only after explicit republish. No private medical data sent to HeyGen or public media platforms.

## Data & storage
Existing encrypted `client_delivery_sessions` draft/published payload now includes `plan.resources`, `plan.additionalRecommendations` and per-asset `media.role`. No extra exposed table needed. Separate additive `sql/client-delivery-session-private-pdfs-20261015.sql` allows private PDF type; retain existing RLS, client/session composite FK and private storage policies. Private PDF ≤15 MB, audio ≤20 MB, MP4 ≤45 MB; Supabase Free bucket 50 MB. Direct public downloads remain prohibited.

## Security and health safeguards
- One guest grant = one session; no implicit access to unrelated reports, past sessions or full cabinet.
- Practitioner-only notes and drafts never reach published client DTOs.
- Client name only renders *after* verified session authorization, not in metadata/URL.
- No automatically generated homeopathic doses, potencies, instructions, change of conventional medication or efficacy claims.
- Digital Twin/public video remains a separate explicitly approved production workflow (#218/#219).
- Sensitive files stay behind a server-verified private Storage proxy with no-store, noindex, strict per-request authorization.

## Acceptance
Confirm mobile 360–430px, WebKit and Chromium, native accordion keyboard access, real PDF magic header, role-specific media positioning, remote-work flag on/off, missing-dose fallbacks, per-client A/B access separation, revoked/expired links, production build and healthy deployment alias.
Do not treat a merged feature flag (OFF) as a fully released private media feature. `HH_APP_SUPABASE_SECRET_KEY` must be provisioned server-only before activating `HH_CLIENT_DELIVERY_ENABLED`.