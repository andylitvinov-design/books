# Client session page — Holistic House UX blueprint (v1.3)

Companion to books #585, canonical implementation PR #592. This design does not authorize automatic publication of sensitive material.

## One consultation, one private living page
Each client receives a session-scoped guest invitation. It opens the exact consultation, not the whole cabinet. A separately authorized cabinet can show the full history. Never reuse the cabinet-wide bearer for guest invitations.
Within ten seconds the page answers: what was our focus, what should I do first, and where can I replay my media or read my report?

## Mobile information order
1. Compact Holistic House header and privacy indicator with generic title.
2. Date, session title, brief personal practitioner-written introduction; long text may expand.
3. One prominent next step and in-page scroll CTA.
4. Optional focus, one or two meaningful sentences.
5. Featured private video, if present; no autoplay or YouTube hosting.
6. Audio or meditation with replay, seek, accessible transcript disclosure if approved.
7. At most three numbered takeaways.
8. Full report: tap to expand/read or download the real, authorized PDF.
9. At most three home practices with title and step-by-step instructions.
10. Confidentiality and link scope explanation; back to all sessions ONLY under separately verified full-cabinet access.

Empty sections disappear. Single-report and single-audio sessions remain useful; no fake progress/checkmarks.

## Practitioner editing
Existing owner Client > Session studio allows title, intro, focus, next action, up to three key points and three practices, media/client versus owner-only, report reference, transcription text and explicit Publish. Owner can preview public-facing content without opening a guest link; private practitioner notes never appear there. Changes to Session A never mutate Session B.

## Privacy and release gate
Any clinical/homeopathic guidance must be individually authored/approved. No automatic dose/potency/diagnosis, medication changes, cure guarantee or replacement of standard care.
Guest Session A cannot fetch Session B, old reports, test history or cabinet. Scoped viewer cookies, no-cache and no-index headers and private media proxy apply. No client name or health details in URL/title/analytics/logs.
Supabase Free private bucket remains non-public with 50 MB object limit; video upload <=45 MB and audio <=20 MB. The real Storage service key is still absent from Vercel and the feature is OFF until explicit gate verification. Real iPhone/Android mic/upload/playback and wrong-client/expired grant tests are required.

## Later stages (not current promises)
Consented saved-to-cabinet, persistent task check-ins, practitioner message inbox, privacy-reviewed speech-to-text and approved HeyGen private Digital Twin messages may be added after MVP verification.