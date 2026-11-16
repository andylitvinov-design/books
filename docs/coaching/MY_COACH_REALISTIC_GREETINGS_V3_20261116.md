# My Coach · Realistic greetings v3 · 16 November 2026

## Owner-approved pilot

Keep **only the four public fictional AI coaches**: Mira, Sofia, Max and Alex (two women, two men). The other four retained historical profiles are still hidden from public discovery. Human practitioner portraits, navigation, dialogue logic and service consent are unchanged.

The owner preferred the newer, more expressive MP4 prototype to the earlier limited 6-frame WebP and basic 3.5-second motion clips.

## What changed

Add exactly four unique, first-party, **silent** MP4 greeting loops and four corresponding first-frame WebP posters under `public/images/holistic-house/my-coach-motion/`, named `{id}-greeting-real-v3.mp4` and `{id}-greeting-real-v3.webp`.

- **Mira:** starts with the owner-preferred realistic MP4 prototype, then closes the end-to-start transition with optical-flow interpolation to avoid the previous hard loop jump
- **Sofia:** generated expression sequence for her own unique bob haircut and peach blouse, then interpolated between distinct blinks/smile poses with a loop-close
- **Max / Alex:** preserve their existing original photographic identities; apply restrained local facial-expression transforms rather than moving the entire picture. These are subtle motion prototypes, not neural lip-sync
- All four clips: 328×456, 24fps H.264, silent, no external runtime providers, static first-frame fallback and no new application dependency. Combined video bytes ~314 KB; posters ~38 KB
- Local post-encode visual quality: first/last-frame RMS differences Mira 3.96, Sofia 3.62, Max 1.84, Alex 1.80 (8-bit RGB pixels). Quantifies loop continuity only, **not** realism or browser acceptance

The existing media component selects v3 for public **greeting** and catalog **idle cards**. In active sessions, real `listening` and `speaking` states continue to use their previous independent loops driven by the actual voice controller; a prerecorded greeting is not represented as true lip synchronization. Reduced-motion and video failures retain a still image. Human clients never send audio to these video assets.

## Release checks

`node --test tests/my-coach-realistic-greeting-v3.test.mjs` plus current `my-coach-four-living-pilot`, coach visual, voice, CI and Chromium/WebKit routes. Verify EN/RU/ES and responsive sizes 320/354/390/430; no identity swaps or different face across hero/session; voice/microphone not interrupted. Original audio playback and user consent must stay unchanged.

Use `GLOBAL_PR_ONE_PUBLISH_V1` and protected `hh-merge-check`. Per the owner decision of November 15, **normal production publication occurs only through the trusted existing hourly Vercel workflow**. Never trigger independent production deploy, a manual emergency, an extra CI wave, or bypass safeguards just to claim LIVE. A merge is not LIVE without exact served deployment/SHA and functional mobile smoke.

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES
