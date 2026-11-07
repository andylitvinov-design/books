# Video Studio: For others → audio-to-video (2026-11-07)

## Product structure

On the first Goal page, **For myself** retains the approved self-video taxonomy. **For others** now has exactly three goals:
- **Greeting or gift** — one card with birthday, anniversary, celebration, gratitude, affection, friendship and support options.
- **Presentation** — introduce a person, project, service or business.
- **Content** — create licensed visual footage from a user-supplied audio recording.

All three are localized for RU/EN/ES. Legacy `gift` and `greeting` identifiers continue to resolve to the combined category.

## Audio content dataflow

The visitor stays on the first Goal screen, selects Content, then chooses an audio file. The screen validates the 4MB upload limit and asks for audio rights confirmation plus separate **one-time external STT consent**. Only the explicit Transcribe button invokes the existing `requestConsentedTimedTranscript` client and `/api/holistic-support/audio-storyboard`. The existing Groq STT endpoint requires pre-confirmed free provider configuration, has shared rate limits and returns verified speech segments without storing the file or transcript.

The original `planAudioVisualStoryboard` engine consumes the transcript and real timecodes, extracts local visual concepts from each spoken segment, scores licensed MP4 scenes and returns a source-bound chronological cut list. The page displays the source transcript, deduplicated visual keywords, scene identities/times and uncertain symbolic matches. It does not invent the transcript, narrate new claims or overlay generic greeting captions.

The explicit **Prepare footage and open Montage** action reuses `applyTranscriptVideo`, `applyAutoFilm` and the existing browser renderer. The original voice File is attached as a **non-looping** track with volume 100. The main Goal Continue action for Content delegates to the same operation instead of taking the visitor to the unrelated Ideas pane.

## Boundaries and release gates

- No automatic external request on selecting a file; no new paid provider, background generation or publishing.
- STT fails closed when the configured free service is unavailable or audio is too large. At present the verified audio-to-video planner only handles up to approximately 59 seconds.
- The planner requires distinct source-approved real clips of sufficient duration, with physically verified aspect ratio; no fabricated clips or unverified crop.
- If no MP4 plan can be verified, show an error and preserve original transcript and audio to retry.
- The separate parent PR #3826 establishes the recipient Goal interface. Merge #3826 before promoting this stacked PR to production `codex/public-book-library`.
- Required checks: unit tests, TypeScript build, iOS/desktop WebKit Goal buttons and audio, exact-HEAD Core/Specialist/Guard CI, final production deployment and live audio smoke test with the free STT flag configured. Do **not** claim LIVE before all of these are actually verified.

## Audio-based editable concept — phase 2

After the consented STT request returns, `deriveAudioVideoConcept` receives only that in-memory
timed transcript and the source-verified cut plan. It auto-fills a **proposal** for:
`purpose`, literal `goal` excerpt from the user speech, `category`, optional
classified `subcategory/topic`, editorial `style`, symbolic `motif`, narrative
`pace`, identified `keywords`, aspect, duration and a timed four-phase shot plan.
The existing 64-topic local taxonomy and reviewed creative choice dictionaries are reused.
Weak topic classification is left unclassified rather than presented as certain.
Symbol/style suggestions explicitly remain editorial; a clip tag is **not**
proof of the actual physical object depicted in footage.

iOS Files sometimes supplies a valid .m4a/.mp3/.wav/.aac/.webm with empty or generic
MIME. The consented STT transport now normalizes the multipart MIME from a
strict six-extension allowlist, preserving the same bytes and only after
the visitor has granted explicit consent. Unknown extensions still fail closed.

This is a **deterministic local concept engine**, not a paid remote LLM call.
Optional provider-backed enhancements need separate consent, existing free-quota
proof and full privacy review before activation.

## Transcript-first fallback (no licensed shots yet)

The editorial concept is computed as soon as a valid transcript exists, even
when the rights/aspect/duration gate cannot yet produce enough real MP4 footage.
In that case `canExport=false`, the timed shot list is empty, and the original
source text, goal, topic, style, keyword and symbol proposals remain visible
on the same Goal page with an explicit no-footage warning. No phantom scenes or
enabled export buttons are created. Literal negations (e.g. "без леса",
"without forest") are preserved in local visual-signal extraction.
