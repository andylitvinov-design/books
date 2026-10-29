# Holistic House · Personal Meditation Composer v2
**Date:** 2026-10-29 · **Status:** implemented in existing PR #2522, not yet merged or production-certified.

## User intent and exact location
Canonical route: `/{en,ru,es}/holistic-support/mandala`, select **Video therapy**. Keep the existing video creator, 8-session guided-imagery course, video filters, 13-track music library and personal affirmation control. Add exactly ONE meditation composer at the bottom, after the personal-video result. This is an extension to the current editor, not a new page/CRM or background AI task.

**One screen, not a questionnaire:** header + small read-only current-video context → two immediately visible selects (**Method** and **3/5/8/12 min**) → collapsed **Additional accents / details** → green **Create personal meditation** → actual editable script, optionally read aloud, Copy / TXT download. Controls >=44 CSS px, readable >=12px labels, 14px editing text, compact ivory/emerald palette, mobile 320/354/390/430 and EN/RU/ES.

## Filters and what they genuinely change

| Filter | Choices / input | Observable effect in generated script or playback |
|---|---|---|
| Current video topic | Energy, Money, Relationships, Goals, Meaning, Wellbeing | Topic-specific resource-focused imagery and action, no medical promises |
| Existing personal goal and difficulty | From the **user-entered**, in-memory guided-course focus | Safely interpreted in narrative; never load raw protected test results without opt-in, never transmit externally |
| Current video composition | Scene, caption, movement and brightness | Selected imagery and narration environment; no imaginary video render |
| Existing affirmations | Only when independently enabled | Up to 3 optional, user-editable affirmations; no involuntary/hidden speech |
| Method | **6**: guided imagery, grounding, gentle body awareness, self-kindness, mindful noticing, practice a small future step | Each builds a different, substantial sequence of narrated paragraphs and progress |
| Length | 3, 5, 8, 12 min | Different number of meaningful guided stages **and** calibrated timed silence; a separate word/voice-based runtime estimate remains visible |
| Chosen accents | up to 3 of 8: calm, confidence, clarity, boundaries, acceptance, small steps, rest, gratitude | Accent-specific paragraphs; if none chosen, bounded non-clinical word matching of explicit local wishes gives suggestions |
| Environment | Current video, garden, stream, light, familiar room, forest, sea coast, mountains | Each imagery choice appears in body, not metadata only |
| Narration mood | Gentle, grounded, uplifting | Actual script language and pacing framing |
| Attention channel | Mixed, visual, sounds, gentle contact, external/eyes-open | Different attention instructions. Inward body focus is optional and includes an external-world alternative |
| Intensity / depth | Light, gentle reflection | Either everyday grounding or optional resource reflection, never forced trauma exposure |
| Closing | Return to the room, reflection prompt, one manageable action | Distinct ending paragraphs |
| Additional personal emphasis | 160-character private input | Incorporated as an optional personal note; no external request |
| Device voice | Installed **local** voice for matching RU/EN/ES language | Browser `SpeechSynthesisVoice.localService === true`; otherwise explicit unavailable state |
| Audio playback speed | 0.75×, 0.9×, 1× | Actual SpeechSynthesisUtterance.rate and updated runtime estimate |
| Selected soundscape | Optional checkbox, uses the existing selected same-origin sound or consented local upload | A real low-volume HTMLAudioElement plays alongside the local reader, never autoplay or implicit audio upload |

## What is a real output?
1. **Text:** Clicking Create calls `buildPersonalMeditationScript` with all explicit filters and owner-entered goals, which assembles original, localized resource-oriented paragraphs. It is a reproducible authored **rule-based generator**, not a claimed general AI text model. You get a non-empty editable script with focus, chosen scene, techniques, prompts, ending and pauses. Changing filters requires an explicit Update; edited words never disappear merely because another filter changed.
2. **Voice playback:** Deliberate Listen uses local device `speechSynthesis`. `parseMeditationNarration` excludes editing metadata and pause labels. It speaks the script in smaller segments, waits the **actual number of pause seconds**, displays a real progress indicator, stops on tab hide/unmount/user Stop and does not select remote voices. Device/browser compatibility and actual audio output require physical iPhone QA.
3. **Saving:** Copy clipboard or download the actual UTF-8 `.txt`; no imaginary cloud save, no pretend generated MP3. The Web Speech API does **not** provide us a reliable encoded audio export. Downloadable narration and final synchronised MP4 need a separately approved, legally licensed **recording/provider** path and true provider E2E. A voice preview is not an audio master.
4. **Length correctness:** Long/short options change actual stages and calibrate cumulative silent pauses to estimated 3/5/8/12-minute durations at native voice rate 0.9. The player independently shows the new estimated duration when speed/text changes; real speech rate is device-dependent, so no exact runtime guarantee.

## Guardrails
- No new Supabase tables, CRMs, Google/Meta telemetry, third-party AI prompts, audio provider requests, paid APIs or renders, automatic video publishing, account storage or persistence. TTS uses only local voices. No photograph, health/test outcome, session outcome or custom meditation text is committed or transmitted.
- Optional self-ratings are NOT clinical norms. The existing 8-session course alone handles verified, consented test provenance; this local writer receives only intentionally selected manual goals. Do not put medical information into pixels/push/Telegram/WhatsApp.
- If input contains explicit self-harm/crisis risk markers, return a **neutral supportive escalation** and no immersive guided meditation. No forced breath-holding, trauma exposure, diagnosis, remedy prescription or guarantees of healing.
- Do not automatically start playback, paid rendering, uploads or a background job on page load.

## Release and acceptance gates
- `node --test tests/personal-meditation-script.test.mjs tests/meditation-filters.test.mjs tests/meditation-narration.test.mjs`: every method / attention / scene / ending materially changes body; 3/5/8/12 actual stages and calibrated pause timing; 3 locales; crisis safe-stop; remote voices rejected; narration really invokes speechSynthesis.speak and a timer; stop aborts timers; privacy.
- Focused ESLint, `tsc --noEmit`, Next production build, existing Chromium + WebKit acceptance on 320/390/430 and EN/RU/ES. Assert panel last, methods, 12min output larger than default, touchscreen targets, editable text, downloadable TXT, no horizontal overflow. Mock speech unit test is **not** proof of audible Safari output.
- Verify diff/conflict against other open editor PRs #2518, #2520, #2521, #2472 before merge; only merge into live source branch `codex/public-book-library` after exact-head CI PASS. Then Vercel READY exact merge SHA, canonical alias `holistichouse.vercel.app` and live tap tests. iPhone installed local voices and background soundtrack mixing are separate manual QA gates.
- Rollback: revert #2522 only; existing 8-session video therapy and standalone editor remain working. No paid account involvement.

## Future phase, not quietly claimed complete
Real downloadable personalized WAV/MP3 including a verified approved voice, background mixing, review/consent, private owner-scoped storage and mastered 8-session videos. Must verify an **actual zero-cost offline-compatible** synthesis/recording mechanism on iPhone/desktop before promise; otherwise ask for provider/account approval and clearly state any cost. Existing HeyGen Digital Twin only with explicit authorized generation and QA, no unapproved spend.