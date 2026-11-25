# Ali / Messenger greeting audio — Free Gemini continuity (2026-11-20)

## Scope and page identity
Canonical user-invoked Ali Persona picker (Home and /en|ru|es/app/messages). Four fictional presenters, one chat intelligence. This is **not** the separate My Coach voice dialogue UI. The approved 390/402px compact picker layout is untouched.

## Current verified baseline
- PR #5124: mobile four-card picker, audio events (merged).
- PR #5176: direct HTMLAudioElement on iPhone, bounded Fish MP3 response, protected tests passed, serving the canonical Vercel alias.
- Source endpoint `/api/ali/voice/{locale}/{alex|max|mira|sofia}` accepts only fixed public greetings, rejects query data, has no user-message input and no auto-play.
- Free Fish `s2.1-pro-free` remains expiry-locked at 2026-12-01 00:00 UTC. Do not remove that date or switch to paid Fish.

## Continuity and voice mapping
The existing Gemini 3.8 Flash-Lite TTS **free** provider config is already present in Vercel production with the free-tier/data-approval flags; no new API keys, paid provider, billing, or environment variable changes.

For the first-party public fixed scripts, `gemini_tts_free` is the preferred natural audio source (WAV with correct `audio/wav` and `Content-Length`). It shares the existing My Coach free global daily rate bucket and the existing Ali per-minute/day budgets; existing public CDN caching is retained.

Owner-chosen RU / EN voice identities:
- Ali (internal `alex`): Alnilam / Charon
- Max: Orus / Orus
- Mira: Erinome / Gacrux
- Sofia: Vindemiatrix / Sulafat

The Spanish greeting uses approved English timbre per persona with Spanish speech; do not claim a separately reviewed ES voice. The allowlist accepts these fixed public greeting names without adding extra options to the separate Coach selector.

If Gemini FREE synthesis itself fails or is throttled, only the previously approved **free** Fish backend may serve the public greeting, and only before its verified expiration. After 2026-11-30 Fish is disabled; no paid fallback is allowed. HEAD returns provider-configured status without synthesizing or consuming quota.

## iPhone recovery
A media failure or timeout must **not** latch the module into permanent `naturalStatus='unavailable'` and silently force iOS SpeechSynthesis on subsequent taps. The next real tap retries the media element while user activation is available. iPhone receives a visible error/retry state instead of false `playing` when provider media cannot start; non-iOS browsers retain device speech fallback.

The public greeting contains no private account, transcript, client data or test results. Existing signed-in history, app/messenger states, voice changes, EN/RU/ES, UX and no-autoplay behavior stay unchanged.

## QA boundaries
Verified pre-publish using deterministic isolated route and iOS mock interactions: four owner voices allowed, free provider selected with 204 HEAD and 200 WAV GET after simulated Fish expiration, correct MIME, shared free rate bucket, native retry after a simulated media failure, no iPhone SpeechSynthesis call. No new GitHub workflow, cache refresh, preview build or manual production deploy was requested.

Pending independent proof:
1. Actual Gemini FREE provider replies with a playable WAV on Vercel (credentials, quota, permissions and model acceptance are remote).
2. One real audible iPhone Safari greeting for each of four voices in EN/RU; user-volume/silent-switch caveats.
3. Protected exact-HEAD CI, merge, hourly production release, canonical alias and served SHA before declaring LIVE.

If real API media smoke fails, **do not claim functional LIVE**, do not auto-switch to a paid provider, and retain GitHub issue #5278 until independently verified.
