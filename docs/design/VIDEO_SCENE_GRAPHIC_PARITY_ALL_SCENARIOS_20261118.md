# Video Studio · Graphical storyboard aligned to all screenplay scenarios · 2026-11-18

## Requirement and scope
The visual scene plan must graphically represent the selected client-specific story, rather than a new generic category montage. A 30-second authored concept contains the same six distinct actions (5 seconds each) in Ideas, Montage → Story and the screenplay.

## Single screenplay contract
- Confirmed personal preferences choose the authored direction; the film signature, scene IDs and six visible physical actions are the authoritative source for BOTH editors.
- Graphical scene sketches use the selected action sentence for each frame. Physical objects are extracted from that sentence first; broad keywords and generic nature tags never override them.
- Rewriting a shot updates the six-shot list, structured screenplay paragraphs, full screenplay and visualActions parameters together, and invalidates old footage tags.
- Rewriting the narrative cannot be approved until it contains the six actions in order with matching scene IDs. The old editorial approval token cannot override this check.
- Storyboard sketches are schematic editorial drawings, not photorealistic generated stills or licensed clip previews. Their Sketch / Эскиз / Boceto label makes this distinction clear.
- If exact approved media is missing, show the shot's specific sketch plus Footage needed without auto-assigning unrelated stock videos. Media licenses, actual objects/actions and technical suitability must still be verified before export.
- Same mechanism is used in EN/RU/ES, in the ready-for-relationship curated stories and the 18 authored v3 story mechanisms.

## Tests and release
Tests verify 20 × 3 × 2 = 120 film selections, exact action/text synchronization, edited/unrelated plot rejection, action-specific sketch cues, and UI wiring.
No external media/image provider, paid model, extra cron, API or storage. Protected GitHub PR merge and existing Vercel production publication only. Do not claim final mobile usability from passing source tests alone.
