# Messenger: «Создать контент» RU/EN/ES · staged integration v1.3

Owner requirement 2026-11-06. Release status is determined by GitHub protected checks and the independently verified Vercel LIVE deployment; this file alone is never release proof.

## Reuse
This change is based on the validated same-origin auth and Video Studio handoff of PR #3719,
and the already-merged recording/upload/original-sound workflow of PR #3732. It keeps
the stable automation hook data-hh-ai-start="video"; no second editor, recorder,
paid API, new CI, new network provider, new queue, or DB migration.

## User journey
1. One compact “Создать контент / Create content / Crear contenido” start action.
2. Choose Video / Audio / Meditation / Message.
3. Audio: use the existing consented voice-record/upload component to produce a video
   with the original audio. This is not a standalone audio-file generator.
4. Video, Meditation, Message: choose Text or Record/upload voice.
5. Text: short personal idea (max 160 chars) → existing MyTube 4x4x4 video scenario
   and approved footage → Studio goal from the user text; final story approval and real
   MP4 export remain solely inside Studio. A word-for-word caption is NOT promised.
6. Voice: original audio stays local, private IndexedDB handoff, explicit recording
   rights confirmation, Studio scene review and original audio lane; no STT is claimed.
7. Retain the former "I want to create video" direct typed shortcut, iHelp,
   guest/identity status, CSRF/auth and safety paths.

## Deliberately absent
Automatic transcript-to-timeline visual segmentation is not yet present; speech is
not silently sent to external STT. Own-video MP4 upload into montage is separate and
not implied by this launch. Independent audio-only output requires a verified renderer.
No rights-incompatible external clips, unlicensed music or unsupported formats.

## Tests and LIVE acceptance
- node --test tests/messenger-content-entry.test.mjs
  tests/messenger-video-dialogue.test.mjs
  tests/messenger-audio-video-handoff.test.mjs
  tests/messenger-compact-followup-actions.test.mjs
- npx tsc --noEmit; Next.js production build; mandatory exact-HEAD Core/Specialist/Guard.
- Mobile EN/RU/ES 320/354/390/430 widths, keyboard, consent, audio decode, real Studio
  storyboard confirmed, MP4 produced and played/downloaded on iPhone Safari.
- Vercel production READY + served deployment SHA and end-to-end functional smoke.
- Current staged Git object alone is NOT delivery.
GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial;
post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES.
