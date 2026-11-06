# Video Studio · 7-axis voluntary video-effect check-in (v1)

## Real browser flow
1. A genuine local `createVideo` attempt starts (not an inferred timer); Studio announces \"Your video is being generated\" and reports only verified `progress` from WebCodecs / MediaRecorder. During initial decoding, progress is indeterminate; no invented countdown is used.
2. While preparing/running, offer seven optional 0–10 ratings: inner calm, mood, clarity, energy, confidence, feeling supported, readiness to act. An unanswered item never defaults to 5 and is not scored as completed.
3. Verified playable *personalized* output is required before a post-check-in. A source-catalog fallback is not reported as a personalized video. Initial ratings are locked when actual playback starts; absent baseline is never inferred retrospectively.
4. Ask "Did you like the video?" (Yes / No / So-so). After viewing, offer the same seven questions; manual "I've watched it" covers external playback. Compare with signed differences including declines and unchanged scores, mean and counts. No baseline => post state only.
5. Answers remain in transient browser state keyed per real export. No automatic upload, tracking, marketing event, backend storage or new service. They vanish on page reload. No causality or clinical efficacy claim.

## Telegram dependency / integration contract (not activated in this PR)
The independent Telegram render worker is pending in PR #3647. Do not alter its exact-HEAD work while CI is running or claim web MediaRecorder progress is available in Telegram. After protected merge, approved database migration and production activation:
- Send one idempotent "Your video is generating" message at verified job acceptance, keyed to the real job ID; edit it using only actual worker stages (queued, downloading, composing, encoding, uploading, ready). No invented percentages. Throttle Telegram edits and honor 429/backoff and STOP.
- Offer the voluntary seven-question initial check-in before viewing, private owner-scoped persistence with one attempt ID, no raw answers in callback_data, and replay/cross-user protection.
- After confirmed MP4 handoff ask Yes / No / So-so using inline buttons. Delivery acceptance is not proof of watching. After self-acknowledged playback, repeat the same seven scores.
- Compute signed change only for two valid measures with the same job, client and ordered axes. Return private summary including declines and unchanged values, with subjective-only disclaimer. Add opt-out/delete; no unsolicited sending to practitioner, public feed, marketing or AI training.

## Acceptance
Run `node --test tests/mandala-video-effect-journey.test.mjs`, `tsc --noEmit`, existing video/real-render/iPhone WebKit CI. Manually verify guest mobile real render, 7 scores including 0, playback, 3 reaction choices, seven retest scores, signed deltas; failed export, fallback and second video reset; no network write by this component.
