# Holistic House: 512 × 14-second meaning-axis film concepts

**Editorial delivery only — not customer-facing, not rendered.**

The existing MyTube hierarchy remains `4 categories × 4 subcategories × 4 topics × 4 old scenarios = 256`; it is not replaced or revised. This sibling collection creates **64 topics × 8 latest owner meaning axes = 512 new short-film concepts**. Combined scenario concept count is 768, *not* 256 × 8.

## Contract

- First-party JSON: `data/video-catalog/meaning-axis-short-scenarios-512-v1.json`.
- Independent reader: `lib/mandala/meaning-axis-short-scenarios.mjs` (does not import on an existing public route).
- Audit: `node --test tests/meaning-axis-short-scenarios-512.test.mjs`.
- Each entry: stable `subsectorId = topicId__axisId`, `id = subsectorId__short-film-v1`, 4 actual filmable actions at 0–3s, 3–6.5s, 6.5–10.5s and 10.5–14s, three caption drafts per locale (maximum 36 Unicode code points each), two optional voiceover lines per locale.
- Latest axis IDs: `anchor`, `connection`, `freedom`, `agency`, `love`, `dignity`, `self-realization`, `recognition`. Old meaning engine uses `wholeness`, `meaning`, `growth`; DO NOT silently remap any old persisted user result. Any migration of selection/profile/UI must be reviewed separately.
- Original eight phrases per new subsector are in the preceding editorial phrase-catalog artifact. This collection carries only the short overlays and rough voiceover draft, not a second phrase registry.
- A film title and a four-shot outline can be unique as text without having individually reviewed, relevant or rights-cleared video. These are structured **drafts**; no individual creative review, photography rights validation, true EN/RU/ES native-speaker evaluation, HeyGen credits, real footage mapping, lipsync QA or physical MP4 acceptance is asserted.

## Safe integration path

1. After human editorial review, add a clearly separate **12–15s meaning-axis short** picker to the existing Video Studio. Do not replace `listMyTubeScenarios`, the 256-film screenplay, the 1536 existing MyTube plot variants, the existing editor, timeline or renderer.
2. Optional `topicId + axisId` selection can call `listMeaningAxisShortScenarios`, but never autoload a medical/mental-health label from personal client data or external trackers. Content may be edited by the visitor and needs explicit approvals.
3. Connect rights-verified media per shot/aspect, respecting the existing style and consent controls; missing binding = no export. Use approved owner avatar only when an explicitly authorized render is requested; no paid API or background/unsolicited generation. Ensure private client assets stay private.
4. Verify 320–430px EN/RU/ES UI, WebKit/iPhone actual H.264/AAC 14s export, download/share on device, privacy and cost gates, protected CI, official Vercel READY/alias/SHA before calling this LIVE.

**GLOBAL_PR_ONE_PUBLISH_V1:** `staged_before_open=yes; local_checks=focused; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES`.