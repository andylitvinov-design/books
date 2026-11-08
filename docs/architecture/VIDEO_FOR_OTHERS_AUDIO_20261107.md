# Video Studio: canonical “For others” + audio concept enrichment

Date: 2026-11-07. Scope: #3880 integration with LIVE #3826 and #3879.
Production owner: `codex/public-book-library`. No new services, payments or media rights.

## Product structure / one renderer

The approved existing first Goal screen from #3879 stays authoritative:
- **Greeting or gift**: illustrated card with a choice between greeting/gift, eight occasions and editable caption sets.
- **Presentation**: illustrated card for introductions, services and projects.
- **Video from audio**: illustrated card with an inline, three-step workflow.

Do not replace the source-approved picture cards, change their IDs (`greeting`, `presentation`, `audio_visual`) or introduce the competing draft `MandalaRecipientAudioEntry`. Do not remove the existing microphone recording, audio playback, consent gates, 9:16 source safeguards, single Montage or browser Canvas export. The original video-for-myself taxonomy remains unchanged.

## Step 1. Voice source

The visitor uploads or records a local File, with 4 MB limit and audio-rights checkbox. No automatic provider call. iOS Files sometimes produces valid MP3/M4A/WAV/AAC/MP4/WebM with empty or generic MIME; the client normalizes ONLY these known extensions for multipart STT, retains the original bytes and filename, and rejects unknown extensions. All checks remain on the original protected STT bridge.

## Step 2. Consented transcript and preview

A separate explicit one-time STT consent and Transcribe action calls the existing server endpoint (only when previously confirmed free-quota provider credentials are configured). The original File and timed transcript are not persisted to local/browser storage. On successful STT, the existing local `planAudioVisualStoryboard` generates a provisional source-bound clip plan. The newly added deterministic, locally executing `deriveAudioVideoConcept` derives an editable **suggestion** for literal speech goal, purpose, category, optional topic, style, symbolic image, pace, visual keywords and timed shot scenes. Low confidence stays unclassified. A clip tag is never evidence of literal footage or permission.

If verified scenes are missing, display the source text, editorial concept and an explicit warning; no phantom shots or export permission.

## Step 3. Apply footage and Montage

The existing `Match footage` action still applies and validates licensed real MP4 clips. The existing `Continue to montage` remains unavailable until the source plan was really applied and rights are granted. Keep the original audio exactly once and non-looping, no generic congratulation captions, automatic rendering, publication or paid network requests. The concept proposal alone never enables export.

## Release evidence

- Keep exact-head Core, focused Mandala tests, real macOS WebKit recorded audio/video, public services browser acceptance, specialist and protected merge gates.
- Include negative coverage for empty speech, unverified footage, source negation, audio MIME and absence of implicit provider calls.
- Reconcile production with a true two-parent merge retaining #3879's canonical implementation and #3885's editorial sun source data.
- Verify protected merge and production Vercel READY deployment + canonical alias SHA before calling LIVE.
- Personal audio with external STT may depend on production's pre-confirmed provider free-quota configuration; no automatic billing or simulated transcription.
