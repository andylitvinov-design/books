# Audio → video through the existing AI Messenger

**Product:** Holistic House, RU/EN/ES, same verified Canvas/MediaRecorder/WebCodecs Video Studio. **No second renderer, STT upload or provider.** This change does not assert that Telegram's separate FFmpeg queue is already LIVE; PR #3647 is independently gated.

## User path
1. In the AI Messenger or sitewide iHelp chat, expand **Audio recording → video**. Select local MP3, M4A, WAV, AAC, WebM or Telegram OGG/Opus, or record a voice note locally with the browser microphone.
2. Browser checks size <=15 MiB, readable duration <=60 seconds; for Telegram OGG it tries local Web Audio decoding to mono WAV. A Safari/WebKit codec failure is explicit, never silently treated as a valid file.
3. Listen to the original recording, optionally enter the purpose/subject, and **explicitly confirm rights**. The client does not send the sound to the language model.
4. One-use same-tab sessionStorage token points to a private IndexedDB File, not a base64 URL/query string. The receiving Studio consumes and deletes the staged File; stale (15 min), wrong locale, wrong token or missing rights fails closed. No API/storage/payment side effects at this handoff.
5. Studio restores that exact File as a **non-looping** user audio track and prefills the existing AI Director with the topic. It selects the nearest supported video length (10/15/20/30/60s). The Director still validates actual licensed MP4 footage and asks the user to confirm scenes; no fabricated preview/MP4.
6. On Director approval, keep the explicitly attached user sound (rather than invoking chooseMusic, which previously erased it); reject plans shorter than the original recording. The existing encoder, video credit/XP authorization and device playback/download acceptance are unchanged.
7. User explicitly clicks the original **Create video** in Studio. Only a verified playable MP4 is offered for download or consented delivery.

## Safety and limits
- No speech-to-text from the attached private audio; topic entry is optional/manual. Do not infer psychological or medical claims from someone else's audio.
- Telegram voice .ogg/.opus is accepted only if Web Audio can decode it *on that device*. iPhone browsers without codec support will show a clear request to use M4A/MP3, not a fake success.
- Audio longer than 60s is rejected by this intake; the existing Studio's full 3-minute audio editor remains separate. No loss/silent truncation; no audio auto-loop for private voice.
- A device that denies IndexedDB cannot use this handoff. Existing Studio manual upload/recording remains the fallback.
- File preview URL is revoked on component cleanup. File is removed from IndexedDB after one handoff; if never opened, the token expires after 15 min and a new transfer overwrites the old slot. The record is not uploaded, indexed, transcribed or logged.
- No separate payments, servers, buckets, workflows, cron or increased render concurrency.
- No auto-charge or auto-render from an audio attachment.

## Regression and release acceptance
- Run `node --test tests/messenger-audio-video-handoff.test.mjs` plus protected Core/Specialist/Guard.
- RU/EN/ES: recording with mic; file upload including M4A/MP3 and decodable Telegram OGG; invalid MIME/oversized/too-long/permissions; privacy/rights explicit; successful same-tab IndexedDB one-use handoff; URL contains no voice data; reload cannot reuse the token.
- Check original audio survives an AI Director scenario confirmation and is **not replaced** by auto music; 20-second voice cannot produce an unacknowledged 10-second cut; manual remove/replacement is respected.
- iPhone Safari and Chromium real-device acceptance: 320/354/390/430 widths; standard Create action → actual video file → native decode/play → save, preserving audible original voice. Availability of a licensed 60-second non-looping montage is an independent Video Studio source gate (#3721).
- Production requires protected merge into `codex/public-book-library` then observed Vercel READY serving the merged SHA and real browser end-to-end smoke. PR opening/CI success alone is not LIVE.
