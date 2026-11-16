# My Coach · One-Play iPhone MP3 playback safeguard

Owner acceptance continuation after merged #4675. Production base at preparation: `ad496652b6dd3dcd13c07d46bb52ae21c8ced12f`.

## Problem and small fix

The merged hands-free loop still called `new Audio()` after the delayed Google Chirp/Fish MP3 response. On iPhone Safari, that playback can reject with `NotAllowedError`, leave the coach in a `ready / Tap to hear` state, and require a **second tap**, contrary to the owner's explicit acceptance requirement.

This follow-up uses one **local, silent 100ms WAV** during the original user Play gesture. The very same HTMLAudioElement is reused for async MP3 synthesis, maximizing compatibility with Safari's per-element gesture activation. It creates no microphone recording, uploads nothing, invokes no paid provider and saves no file. Its temporary object URL is revoked. The existing server-bounded natural-voice choice and coach persona logic are untouched.

If the browser still blocks MP3 on the unlocked element, the voice runner automatically attempts the built-in device speechSynthesis voice instead of telling the visitor to click Replay. If the OS disallows all audio without another gesture, browser policy cannot be bypassed; the already existing visible transcript and manual voice replay remain accessible.

## Verification

The existing tests are preserved, and a regression test checks same-element Play → MP3 reuse, URL cleanup, automatic onBlocked fallback, and absence of recorded audio in coaching. Existing rate limits and vendor privacy disclosures unchanged. Physically verify on iPhone Safari after deployed: one Play, audible unique intro, 3+ free bilingual turns without repeat taps, manual Stop, background/resume, and typed fallback. No claim of physical-device confirmation from CI.

This is deliberately a three-code-file change, no database, background job, new Vercel infrastructure, provider enabling, keys, Google billing or new paid services.
