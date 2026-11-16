# Video Studio — Artlist-inspired improvements (15 Nov 2026)

## Delivery status and safety
This change extends the existing six-workspace Holistic House Video Studio. It does **not** add a new video renderer, billable API, subscription, cron, background job, database table, public media upload, or automatic publication.

| Idea | Current implementation |
|---|---|
| Reusable characters | The existing Stories & Characters panel now saves up to 5 approved **catalogue IDs** in browser localStorage and lets the visitor reselect them for a new video. No private photos/prompts are saved. The collection does **not** sync across devices or accounts. |
| Character continuity in shots | The existing `appliedStory.character` is used by the same Canvas preview and export paths; the only currently enabled first-party motif is C01. The other 13 AI character concepts remain disabled for export until a real provider, rights and cost gate exist. |
| Creative presets | Three additional EN/RU/ES templates (choice story, practitioner introduction, forest breathing) use the existing template selector, verified scene search and local rendering. They do not claim new filmed characters, lip sync or generated footage. |
| Visual storyboard | Existing Montage Story/automatic five-shot board, photo/scene preview and on-apply choices are reused. No competing NLE or scene editor is created. |
| Preview before final export | Existing in-browser Canvas/storyboard preview remains free; actual Ready MP4/WebM production still uses the verified existing renderer and its credit and playback checks. A preview still is NOT evidence of a decoded final MP4. |
| Voice, music and captions | Existing Audio/Montage controls remain the single owners; no extra TTS provider or music licensing change. |
| Artlist MCP | **Not connected or called.** Potential future premium provider: `https://mcp.artlist.io/mcp`. No Artlist credentials, subscription, automatic spend or assumption of general MCP compatibility. |

## Acceptance
- Verify under `/ru/holistic-support/mandala`, `/en/holistic-support/mandala`, `/es/holistic-support/mandala` → PRO → Characters: select a catalogue character, open **My characters**, save; reload, choose saved, Apply; delete it and verify removal.
- Safari iPhone 320–430px: no horizontal overflow and all Use/Remove controls reachable.
- Choose the three new Goal preset cards; retain visitor exclusions and preview an approved local storyboard.
- Final Ready still requires verified generated media, correct credits, download/save and real iPhone playback; do not call this LIVE before protected merge, confirmed production SHA and browser smoke.

## Follow-up that is **not** silently enabled
An account-synced Character Bible (per owner, approved reference images, stable pose/expression IDs), true scene-by-scene animated human/cartoon generation and Artlist premium connector require separate implementation with authenticated storage/RLS, rights & consent checks, per-scene approved fixed quotes, idempotent charge hold/commit/release and post-render validation. Use existing `lib/mandala/stories-studio.mjs` execution policy; an unavailable Artlist provider must not replace the working local fallback or trigger paid calls.
