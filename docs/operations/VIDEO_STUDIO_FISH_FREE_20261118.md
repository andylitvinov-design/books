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


## Fish voice cards on the approved Therapy → Voice screenshot (18 Nov)

Root cause: PR #4969 integrated \`MandalaCloudVoiceStudio\` but the actual
Voice tab uses \`MandalaAffirmationVoice\`. The same existing picker now has
Female (3) / Male (3) / Fish (2) / My Voice, with two genuine server-side
RU/EN reference IDs, not fabricated gender profiles.

Fixed Fish samples and explicitly approved phrases use the existing
\`/api/holistic-support/voice\` server endpoint. WAV nature mix,
on-device narration, the six Gemini voices, consent/quotas/private data and
the final video exporter remain unchanged. An unapproved Fish provider is
shown with disabled playback and an explanatory label, never fake audio.
Fish mode does not translate a phrase, and the previous language is
restored when leaving Fish. The existing macOS 320–430px browser suite
checks visible cards and blocked calls. Production activation and real
provider audio QA remain separate, as documented above.


## Approved curated purpose filters (owner, 18 Nov 2026)

**Source:** owner explicitly selected Selene, Sarah, Jordan, Игорь, Екатерина and
Calm Meditation Voice. Exact public Fish model pages were verified.
- Coaching EN: Sarah (Fish Official), Jordan (Fish Official)
- Coaching RU: Игорь Igor (Fish Official), Екатерина Ekaterina (Fish Official)
- Meditation EN: Selene (Fish Official), Calm Meditation Voice (third-party hold)
- Meditation RU: none approved. Do **not** relabel a coaching voice as an approved meditation voice.

The visible Therapy → Voice Fish tab now has **Coaching / Meditation** filters.
It shows six names in total, only five Fish Official voices enabled for synthesis
after normal free-tier owner/user consent. Calm Meditation Voice is visible but
disabled pending proof of platform commercial-usage license. A general owner
permission is not a substitute for the third-party voice owner's license.
No stock substitute, paid call or voice cloning was authorized.

**P0 correction:** Existing saved \`HH_COACHING_FISH_VOICE_RU_ID\` points to the
English official Adrian voice; it cannot be labeled Russian. Approved RU Fish
models are now server-only pinned to Igor and Ekaterina's verified Fish
Official reference IDs. Legacy \`fish-ru\` is mapped to Igor for old drafts,
not the erroneous Adrian. The existing verified Sarah key remains unchanged.

The server pins exact \`s2.1-pro-free\`, fails closed after 30 Nov 2026,
validates 24kHz mono WAV, forbids paid fallback, and never logs/stores
visitor audio or sends test/health records. End users must separately opt in
before any personally supplied text is transferred.
Production Fish use was owner-authorized 18 Nov 2026; five existing production
flags were configured, reusing the already present server-only Fish API key.
This is a configuration receipt, not proof of real provider E2E.
