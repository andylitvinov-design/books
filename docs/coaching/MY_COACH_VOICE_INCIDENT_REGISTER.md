# My Coach — Voice Incident Register & Recovery Runbook
# Реестр ошибок голосового коучинга и инструкция восстановления

**Canonical register:** `docs/coaching/MY_COACH_VOICE_INCIDENT_REGISTER.md`. Append future voice incidents here; preserve historical entries and evidence. Scope: all public My Coach personas, RU/EN/ES, browser Gemini Live Free voice. Not a chatbot/Simli video runbook. Search aliases: коуч молчит, пропал голос, текст есть звука нет, Listening but silent, Illegal invocation, GeminiLiveReplyWatchdog, G-L12, iPhone Safari, PCM, audio session, Restore sound.

## Non-negotiable owner requirements (2026-11-25)
- Ordinary Play / pause / continue / end controls retain their meaning; **no separate Restore sound or Enable audio button**, and no hidden replacement of the normal call button's action.
- Automatic bounded recovery in the existing call; keep session context, transcript, user-confirmed pause/end, microphone permission, assigned voice and current video/layout intact. No silent replay of private speech, no unapproved provider, quota bypass or paid fallback.
- Do not declare restored on the basis of a transcript, Listening, WebSocket connection, green CI or a READY deployment alone. Prove actual audio output on the canonical site and separately obtain physical iPhone acceptance. Distinguish simulated provider/audio tests from real conversation.
- Keep the existing protected production branch `codex/public-book-library`, required CI, native merge and sole hourly production publisher; no extra Vercel build, service or spend for documentation.

## Incident HH-VOICE-20261125-01 — P0: assistant transcript visible, no voice

**First reported:** 25 Nov 2026, Toronto. Previous working voice reported by owner on 24 Nov. Harry session showed Listening, microphone active and assistant transcript but no audible speech. Other personas share transport; individual real-device failures were not independently measured.

### A. Confirmed browser regression (primary reproduced cause)
- ID: **VOICE-01 / BROWSER_TIMER_ILLEGAL_INVOCATION**. Regression introduced in [#5581](https://github.com/andylitvinov-design/books/pull/5581), merged 24 Nov around 20:53 Toronto according to root-cause investigation; first affected production build recorded as `63083ddf5`.
- File/symbol: `lib/coaching/gemini-live-transport.mjs`, `GeminiLiveReplyWatchdog.constructor / touch / arm / clear`.
- Native browser `setTimeout` and `clearTimeout` were stored as object methods and invoked with a watchdog instance as receiver. Browser rejected this with `TypeError: Illegal invocation`. Incoming response processing had already updated transcript, but failed before scheduling PCM in the player. The watchdog intended to recover stalled replies could itself prevent replies from becoming audible.
- Old production source `eb400c1a` had defaults `schedule=setTimeout,cancel=clearTimeout`. Correct defaults: `schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id)`.
- Reproduction evidence recorded in [#5672](https://github.com/andylitvinov-design/books/pull/5672): replay of public Harry bundle with synthetic mic/provider in Chromium yielded two exceptions and zero non-silent output windows. Changing only timer defaults produced measurable output in both successive replies, two final transcripts, one mic/token/socket and no errors, with and without forced interruption. This is a controlled browser reproduction, not direct logs from the owner's iPhone.
- Fix: [#5672](https://github.com/andylitvinov-design/books/pull/5672), head `0fbdcf15d2867f1473d554d0516ace1d4cc05516`, merged `d2e15963cbd5cd96a9147403fae9c13d24651bd2` at 20:09:31 Toronto on 25 Nov. [Core CI 45733186166](https://github.com/andylitvinov-design/books/actions/runs/45733186166) success; local release suite reported 687/687.
- Regression test: `tests/my-coach-gemini-live-session-playback.test.mjs`, “browser timer receivers do not interrupt incoming PCM or completion of successive replies”. Must exercise default production timers with browser-like receiver validation; injected fake timers alone did not expose the original bug.

### B. Additional confirmed code gaps (not separately proven causes on owner's device)
| ID | Defect / symptom | Corrective action | Evidence |
| --- | --- | --- | --- |
| VOICE-02 / TRANSCRIPT_WITHOUT_PCM | Completed response with transcript but no PCM returned to Listening as though voice succeeded | Explicit missing-audio G-L12, mark unheard response interrupted, bounded same-credential recovery if valid checkpoint available | [#5663](https://github.com/andylitvinov-design/books/pull/5663); `finishAudibleTurn`, `recoverStalledReply` |
| VOICE-03 / PCM_MIME_WHITESPACE | Valid `audio/pcm; rate=24000` was rejected by strict MIME matcher | Accept optional parameter whitespace, retain 24 kHz validation | #5663; `readGeminiLiveServerMessage`; test “standard MIME whitespace does not discard 24 kHz PCM” |
| VOICE-04 / AUDIO_CONTEXT_INTERRUPTION | WebAudio context interrupted after last incoming packet; no next PCM to trigger resume | Observe audio context state changes and drain held audio automatically with cleanup | #5663 and #5670; `handleAudioContextState`, `flushPendingAudio` |
| VOICE-05 / STALE_IOS_ROUTE | iOS device output session and WebAudio may resume independently; context can report running while route is stale | Correct category drift; guarded audio session reactivation and duplex route selection; handle versionless standalone WebKit/iPad UA; avoid cycling healthy route on every reply | [#5670](https://github.com/andylitvinov-design/books/pull/5670); `refreshLiveAudioRoute`, `refreshCoachLiveDuplex` |
| VOICE-06 / STALE_RESUME_PROMISE | Rejected or unfinished resume left last reply waiting indefinitely | Supersede stale attempt on actual device reactivation, ignore late rejection, suppress duplicate attempts | #5670; `requestAudioResume`; tests “hardware reactivation alone plays the entire held reply after a failed resume”, “hardware reactivation supersedes a pending resume once and ignores its late rejection” |
| VOICE-07 / ROLLOVER_DROPS_TAIL | Socket rollover disabled state handler before completed local reply drained | Drain completed buffered reply before reconnect, preserve existing credential/checkpoint, render samples once | #5670; before fix 0 of 12,000 synthetic samples rendered; after fix 12,000 once; test “socket rollover drains a completed reply and resumes the original credential and handle” |
| VOICE-08 / EXTRA_RECOVERY_CONTROL | Separate recovery button or replacement of ordinary mic-orb action contradicted owner UX requirement | Remove extra controls, keep normal call controls, recover automatically; non-interactive localized status only if recovery impossible | #5670 final merged version; dialogue/CSS preserved, no separate button |

Relevant source files: `components/my-coach-gemini-live.jsx`, `lib/coaching/gemini-live-transport.mjs`, `lib/personal-coaching/coach-ios-live-duplex.mjs`; check `components/my-coach-live-dialogue.jsx` for UI wiring. Relevant tests: `tests/my-coach-gemini-live-session-playback.test.mjs`, `tests/my-coach-gemini-live-failures.test.mjs`, `tests/my-coach-gemini-free-live.test.mjs`.

### C. Release and verification mistakes (not causes of audio silence)
| ID | Issue | Resolution / prevention |
| --- | --- | --- |
| RELEASE-01 / INCOMPLETE_FIXTURE | Initial #5663 CI failed 2 of 679 tests: old mocked session did not include the added runtime dependencies | Repair fixtures and assert recovery behavior; keep required CI. Final #5663 merged `66d6ec1e`, 679/679 reported. |
| RELEASE-02 / ASYNC_FIXTURE | #5670 previous head `7e7e35ee` failed release verification: fake audio clock advanced before cross-realm async callbacks settled. Automated repair could not produce verified bounded patch. | Correct fixture timing; add nonzero PCM, duplicate event, stale promise and lifecycle regressions. Head `da7786cb` local suite 686/686, TypeScript noEmit passed; [Core CI 45732342813](https://github.com/andylitvinov-design/books/actions/runs/45732342813) and [coaching CI 45732342475](https://github.com/andylitvinov-design/books/actions/runs/45732342475) success; merged `feabf1c8`. |
| RELEASE-03 / FALSE_LIVE | Merged correction may not yet be on canonical domain; successful publisher job can skip deployment | Check Vercel alias, READY state, exact commit or ancestry. [Publisher 45733866906](https://github.com/andylitvinov-design/books/actions/runs/45733866906) on 25 Nov 20:10 Toronto logged “Production deployment created within the last 60 minutes; skip routine build.” Not a publish success. |
| RELEASE-04 / TEST_COVERAGE_GAP | Node mocks alone cannot establish browser native API binding, speaker audibility or hardware audio route | Add browser receiver regression and nonzero PCM measurement. Physical iPhone plus actual Gemini exchange remain separate acceptance gates. |

### D. Incident acceptance ledger
- Source: #5663, #5670 and #5672 merged; exact final timer fix `d2e15963c`. No separate sound restoration control. Shared voice mechanism, no new service or manual deployment.
- Last verified canonical deployment in this incident at 25 Nov ~20:15 Toronto: `dpl_6wXdSMt7VFN1TKXEwyPra9XFPPFd`, READY, serving `eb400c1a` (still vulnerable timer). Do NOT infer present live status from this historical record. Recheck canonical alias before any later claim.
- Browser simulated playback regression: passed as described in #5672. Hardware interruption simulated playback: passed as described in #5670. Actual Google/audio exchange on a physical iPhone and final LIVE acoustic acceptance: **unconfirmed at incident recording**.
- No real client's words, raw audio, secrets, ephemeral tokens or account identifiers belong in this register or diagnostic logs.

## Prior related voice incident references (different pathways, not proof of current cause)
- 19 Nov: [Safari SpeechSynthesis cue stalls](MY_COACH_LIVE_RESPONSE_SAFARI_RECOVERY_20261119.md): old speech cue error used to call silence()/idle, destroying the one-Play session. Recorded-STT fallback preserved conversation by returning to ready. Check only if using that earlier voice path.
- 19 Nov: [Microphone health recovery](MY_COACH_MIC_HEALTH_AND_RECOVERY_20261119.md): authorized but muted, ended, suspended or flat microphone could show Listening without usable input. One bounded reacquisition, MIC_NO_SIGNAL on persistent failure, preserve context; Error.name formerly masked Error.message. This is an input-side fault, distinct from visible assistant transcript with no output.
- 20 Nov: [Gemini Live Free duplex architecture and acceptance](MY_COACH_GEMINI_LIVE_FREE_DUPLEX_20261120.md). Historical configuration and persona counts are not current truth; inspect current configuration without logging keys or secrets.

## Quick triage when a coach goes silent again
1. Record UTC/Toronto timestamp, persona/locale, browser/OS, first vs later turn, audio output route and whether greeting, mic, transcript and reply audio separately work. Use synthetic non-sensitive input for debugging.
2. Resolve canonical `https://holistichouse.vercel.app` deployment and production branch SHA; compare `gemini-live-transport.mjs` and `my-coach-gemini-live.jsx`. If deployed code is stale, diagnose publisher first; do not blindly add another PR.
3. Check browser console for Illegal invocation / watchdog stack, network setup and WebSocket frames, audio MIME and sample rate, PCM receipt vs actual scheduled audio, WebAudio state, device audio-session state, pending queue and actual nonzero output. A Vercel server log with no errors does not establish browser audio health (direct WSS).
4. Route the symptom: transcript present + no PCM → VOICE-02/03 or provider; PCM received + no scheduled output → VOICE-01/04/06; scheduled output but silent → VOICE-05/physical route; tail lost at reconnect → VOICE-07; no input/transcript → microphone runbook. Confirm with evidence, not assumptions. Do not request secrets or log private payloads.
5. Run existing release suite plus real browser tests that use native timer defaults, two successive responses, nonzero audio, pause/continue, route interruption, return from background, rollover, cancellation and no extra controls. Verify no duplicate audio, token requests or unintended microphone activation.
6. Use protected PR checks and existing hourly publisher; check canonical alias contains fix. Then test real free authorized Gemini exchange and physical iPhone Safari (speaker/earbuds, multiple turns and pause/continue) without new paid usage. Mark LIVE only with evidence; retain unresolved issues explicitly.

## Template for subsequent incidents
`HH-VOICE-YYYYMMDD-NN | priority | status | timestamp | deployed SHA | symptoms | scope | reproduction | proven root vs hypotheses | file/symbol | introducing PR | fixing PR/commit | regression test | CI | canonical LIVE | actual device/provider acceptance | outstanding blockers`.

Add an entry on every newly identified defect, update with evidence rather than overwriting earlier facts, and use existing incident IDs when a fault recurs. This register documents the reported 24–25 Nov incident and earlier linked voice-specific runbooks, not an audit of every historical Holistic House bug.
