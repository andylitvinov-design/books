# Therapy Studio — personal short meditation text choice (approved 18 Nov 2026)

## Owner screenshot / identity
Reference: latest owner-approved mobile image in conversation, Nov 18. The intended route is the **existing** `/{en,ru,es}/holistic-support/mandala`, Video Studio → sixth workspace **Therapy**, guest or logged-in editor with a selected client scenario. Do not confuse this with the Guided course workspace or practitioner dashboard. The first visible Therapy screen concerns **approval of meditation text**, not watching or rendering a meditation video.

## Approved appearance and actions
- Retain global six workspaces and site bottom navigation. Therapy introductory banner uses compact warm ivory / lotus, **no large duplicate video hero**.
- Remove the Single practice / 8-session format segmented control. Four one-row tabs: **Meditation / Voice / Practice / My Course** (RU/EN/ES).
- Default Meditation: one white/ivory compact panel, “Choose your meditation”, two mutually exclusive tabs **Option A / Option B**. The tabs swap the **complete** local scripts in one readable space, not two duplicated cards, thumbnails, audio players or generated videos.
- Scripts reflect the selected goal and are written for approximately **30 seconds**, with no playback or cloud call on page load; actual spoken duration depends on the selected voice and pauses. Text may scroll **within its panel** on narrow phones without truncating content. Do not advertise exact 30.0-second spoken/audio export without measured duration.
- A single green **Choose this meditation** button explicitly approves the active text and moves into the existing **Voice** flow; approving does not upload/send text until separate consent. Outline actions **Generate 2 new options** (local, no paid AI) and **Customize text** (inline edit).
- **My Course** reuses original eight-session component, with separate on-demand sessions; opening it is not the creation/purchase of eight videos.
- Retain Practice and optional effects, original video creation paths, consented external AI/voice, local audio and access/privacy controls. Do not publish, render, spend credits or write to CRM on selection.
- At 320/354/390/430px, check one-row tabs readable/tappable, no horizontal overflow, legible text, selected button and progress above fixed bottom dock, EN/RU/ES and voice approval E2E.

## Code/source mapping
- `components/mandala-therapy-studio.tsx` — four-tab shell and selected-text approval -> Voice.
- `components/mandala-therapy-text-picker.tsx` and `.module.css` — local A/B text switch, one text viewport, local regeneration and edits.
- `lib/mandala/short-meditation-options.mjs` — two local, scenario-themed, short variants with original safety check.
- `components/mandala-free-video-studio.tsx` + `components/mandala-video-mobile.module.css` — same route, existing stage, therapy-specific compact intro and original editor callback.

## Release guard
Follow `AGENTS.md`, `GLOBAL_PR_ONE_PUBLISH_V1`, protected exact-HEAD Core/Specialist/browser/`hh-merge-check` and existing **hourly** Production Vercel publication. Do not create a separate deployment, paid generation, new API, migration, CI workflow or provider call. This source specification and mocked browser checks do not prove real narrated 30-second WAV, actual looping MP4, physical iPhone rendering, or live domain SHA. Verify those separately when possible.

## Canonical MyTube 256 scenarios × 2 RU meditation drafts — 18 Nov 2026
- `data/video-catalog/mytube-content-taxonomy-4x4x4-v2.json` supplies four categories × four subcategories × four topics × four scenarios = **256**, not the unrelated 120 Video Goal scripts.
- The 512 RU editorial texts reside in `data/video-catalog/mytube-meditations-512-ru-v1.json` and are keyed by exact approved film scenario ID.
- The selected scenario's two variants appear in Therapy Meditation. When no approved scenario exists or locale is EN/ES, existing localized, cost-free fallback texts remain. Never show RU on EN/ES.
- Crisis checks always precede library selection; human choice/approval precedes optional cloud narration and real Video Studio audio attachment. The voice/navigation CTA is not a purchase, delivery or entitlement.
- 30 seconds is a target, not an actual WAV measurement. No Fish bulk render, additional keys, new storage, provider charges, or deployment are created. Owner voice approvals, 30-second measured WAV, and physical iPhone MP4 sound E2E remain separate gates.
