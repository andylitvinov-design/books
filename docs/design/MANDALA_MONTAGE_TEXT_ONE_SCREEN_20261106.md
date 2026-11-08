# Montage / Text · Holistic House mobile owner-approved implementation

Date: 2026-11-06. Canonical guest route: /{en|ru|es}/holistic-support/mandala; active Video Studio workspace = editor (Montage), active subpanel = Text. Reference: owner-approved 06-Nov chat-generated mock, not an authorized stock image. Do not confuse it with Goal/Ideas, signed-in client cabinets, or a new route.

## Reference measurements (approximate, 390px CSS viewport)
- Keep existing shared mobile header/6-step Studio nav, warm ivory canvas #FBF5E9, #FFFCF7 card.
- Single existing 16:9 video preview remains first; 4 mutually exclusive tools below preview.
- Text panel starts immediately with paired pale-mint Add setups (N) and Add text buttons, ~46px height; there are no duplicate Add text controls.
- Selected setups form an editable, individually selectable sequence with compact time labels and pointer-drag handles; alternate Move up/down controls for keyboard/touch.
- One existing text/video/audio timeline with current playhead and undo/redo/play; overlapping content uses the exact original on-device Canvas compositor.
- Selected text gets horizontal motion preset rail and speed/direction selectors; full caption timing, style, position and delete stay in an on-demand details panel.
- Bulk scenario input, SRT import/export, beat cut and draft load/save remain on this page in collapsed details rather than monopolizing the top of the screen.
- Preserve original Generate video CTA, licensing rights, credits, local audio/photo consent and no autoplay. No second server renderer, no paid model calls.

## Behavioral invariants / caveats
- The setup count equals the owner's *actually selected* text affirmations (up to five); never silently invent/auto-select unchosen health phrases solely to display (5).
- Import divides 30 seconds into five 6-second clips when five selected; 15 seconds into five 3-second clips, etc.
- Reordering changes the actual subtitle playback order and keeps selected clip motion, ID, and style; manually moved time slots remain if Auto timing is off.
- Motion presets are computed on the same Canvas used in real preview and export: Move, Grow, Shrink, Rotate, Float, Pulse, Type plus legacy Fade/Slide Up/Pop; no CSS-only movie effects.
- Importing readable setups prevents rendering the same selected affirmations a second time as transient hypno-overlays.
- EN/RU/ES; iPhone 320,354,390,430 px, Safari/WebKit and Chrome/Chromium, OS keyboard and safe area; original tests/CI remain release gates.

## Verification status
Source-change preparation does not prove browser visual fidelity, READY or real MP4 export. Update linked PR with exact HEAD CI, screenshots, release SHA and any outstanding iOS checks before claiming live.
