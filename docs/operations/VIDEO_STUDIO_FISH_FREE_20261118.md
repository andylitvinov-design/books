# Video Studio → Therapy → Voice: Fish Audio FREE pilot (18 November 2026)

Existing local SpeechSynthesis preview, six Gemini profiles, optional free English Deepgram,
WAV nature-bed mixer, private browser files, and attach-to-video are reused.

New Fish selection: EN or RU, using authorized server-only reference IDs; no unverified stock
voice names or publicly editable cloning. A fixed public sample needs no personal text.
User-entered text requires positive explicit cloud consent; 650 characters max,
same-origin, existing auth for personal scripts, existing rate gates plus 30/day global Fish
quota. The request sends exact \`model: s2.1-pro-free\` and gets 24kHz PCM16 WAV at 0.86x speed.
No retries, paid fallback, audio persistence, CRM logging, credential in browser or DB change.

Fish declares free access through 30 November 2026 only and permits possible model-training
use of submitted text. Provider is disabled by default and automatically off after
2026-11-30 UTC. Full eight-session audio masters remain a separate deliverable in issue #2503.

Activation requires separate verified owner approvals and production flags:
\`HH_VOICE_STUDIO_FISH_ENABLED=true\`,
\`HH_VOICE_STUDIO_FISH_FREE_TIER_CONFIRMED=true\`,
\`HH_VOICE_STUDIO_FISH_FREE_DATA_APPROVED=true\`,
\`HH_VOICE_STUDIO_FISH_VOICE_RIGHTS_APPROVED=true\`,
\`HH_VOICE_STUDIO_FISH_USE_COACHING_KEY=true\` (only if explicit reuse of existing
\`HH_COACHING_FISH_API_KEY\` and RU/EN reference IDs is approved). Independent dedicated
Fish key and RU/EN reference variables are also supported. Do not print or move secrets.

Evidence needed: exact-head Core/Specialist/merge; Vercel hourly READY + canonical SHA;
real no-PII RU+EN Fish samples, measured valid non-silent WAV, listen on iPhone,
consented text → mixer → video attachment → working exported video. No physical provider
verification means NOT LIVE E2E, even after merge.
