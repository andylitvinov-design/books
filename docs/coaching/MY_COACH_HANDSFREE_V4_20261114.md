# Holistic House · My Coach · Hands-free voice v4 (14 Nov 2026)

Status: release candidate, **not a claim of Production availability or physical-iPhone verification**.

## Owner acceptance contract

One Play button in the selected AI coach's distinct, localized introduction card below the hero starts the coach's **audible spoken introduction**. Once the coach finishes speaking, the browser begins recognizing the client's next answer; after the existing verified-coaching answer returns and is spoken, listening resumes automatically. No second microphone tap per sentence or 18-second recording window. The microphone button is an optional Stop/restart control, not a recorder.

The UI does not show the old Fish Audio checkbox, recording instruction, repeated consent dialog, or separate wizard voice selector. A small notice beside Play discloses whether an approved natural voice provider will process **coach-written text**; the expanded privacy details disclose the browser speech-recognition provider and the provider's additional terms. Fish Audio's free pilot can use coach-generated text for model improvement. The Play gesture enables only a provider already returned as available by the protected server capability; a provider discovered after Play cannot silently become enabled.

No MediaRecorder, Blob of captured microphone audio, FormData upload to Groq Whisper, mic file storage, or client-side recordings are involved in My Coach. Browser SpeechRecognition still turns spoken words into text and **may itself use the browser's speech service**. The existing private assistant route can process recognized text as described in the privacy details, with the verified-free-model gate; when unavailable, local authored coaching continues. No implicit upgrade to paid providers, new billable GCP infrastructure, new model, database, or cron.

The existing MP3 provider path is retained where the **approved and currently available** server-side natural voice can actually synthesize text. A single local silent PCM playback is started in the first Play gesture to help iPhone Safari allow later MP3 playback on the same HTMLAudioElement; this local silent audio is not a recording or an upload. If natural-voice synthesis or playback fails, the client tries native speechSynthesis rather than silently doing nothing. If even the browser cannot play voice, show an honest Retry/Replay state; never claim audible success from a text-only reply.

iOS speech recognizer retries are bounded, live interim text appears in the single transcript, and final/interim-only answers are committed after a short pause without user Stop. Backgrounding/End cancels active listening and audio. Voice presentation must not auto-start on page load.

The existing eight authored persona introductions and voice profiles are preserved. The pre-Play introductory card calls the single hands-free runner on Play, never a second speech engine; the runner is mounted but hidden until Play, preserving iOS gesture activation. Mobile dialogue v4 occupies one dynamic viewport. Portrait, voice controls, scrollable transcript and **pinned editable message composer** stay inside it; supplementary goal cards, redundant disclosure blocks and site nav are hidden on small screens, not stacked above the text field. The user can still use Text, CC, Replay, End, RU/EN input options and the collapsed privacy disclosure.

## Pre-merge and Production acceptance checks

1. Source-level regression tests: no recording/upload path; Play introduction and live listen/speak loop; consent-by-action notice and no vendor checkbox; iOS interim-only settling, bounded retries, iPhone MP3 unlock reuse, private server routes and all three locales.
2. GitHub protected PR with one published head; exact-HEAD Core/Specialist/Guard checks, no unsafe bypass. Verify Vercel Production READY exact merged SHA and public alias separately from PR merge.
3. On a **real iPhone Safari**, open Mira and another coach, tap Play once, hear an intro with sound, speak at least 4 successive RU and EN turns without extra mic taps; verify each transcript turn and audible coach reply, stop/restart, Replay, iOS permission denial, background/foreground handling, a failed TTS call, a free-model outage, and no clipped input field at compact iPhone heights. Verify provider identity and usage; do not assume browser automation proves audible sound.
4. Fish free availability is time-limited. Google Chirp 3 HD must not be switched on without independently approved Google Cloud credentials and billing/cost controls.

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; post_open_head_updates=0; new_paid_infra=NO; iPhone_E2E=pending until physical confirmation.
