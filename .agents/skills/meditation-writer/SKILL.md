---
name: meditation-writer
description: Create or implement original, voice-ready, psychologically gentle RU/EN/ES meditation scripts for Holistic House using small local/free LLMs. Use when asked to write a personal meditation, construct a literary meditation prompt, improve narrative quality, implement or test the Meditation Writer Mind, or prepare text for TTS. Keep Psychologist Mind's safety/consent gates authoritative.
---

# Holistic House — Meditation Writer Skill

Use this skill for the **literary writing process**, not independent clinical formulation, diagnosis or trauma processing.

## Canonical references

Read only when needed:
- [Executable algorithm and copy-ready prompts](../../../docs/holistic-support/MEDITATION_WRITER_SMALL_MODEL_SKILL_V1_20261030.md)
- [Dual-intelligence architecture and release gates](../../../docs/holistic-support/MEDITATION_WRITER_DUAL_INTELLIGENCE_ARCHITECTURE_V1_1_20261030.md)
- [Prompt compiler](../../../lib/holistic-support/meditation-writer/small-model-skill.mjs)
- [Reviewed meaning brief](../../../lib/holistic-support/meditation-writer/brief.mjs)
- [Existing independent safety/editorial validator](../../../lib/holistic-support/meditation-writer/editor.mjs)
- [Own-model Ollama adapter](../../../lib/holistic-support/meditation-writer/owned-writer.mjs)

All links are relative to the SKILL.md directory. The production branch is codex/public-book-library; GitHub default is not the production target.

## Safe creation workflow

1. **Validate, do not infer.** Use explicit locale, focus, chosen goal, style, duration and exclusions. Do not infer medical diagnoses, past trauma, personal relationships or hidden causes from a free-text prompt.
2. **Obtain the server-approved brief.** For programmatic writing, first call Psychologist Mind and prepareMeditationCreativeBrief with trusted preflight and purpose-specific consent. Never turn client-provided consent/user ID/safety flags into authoritative facts.
3. **Stay within the KIP allowlist.** Self-guided automatic scripts use only gentle_nature, supportive_object, comfortable_corner or small_light. Classical KIP motifs or requests to reprocess memories require qualified human guidance; do not silently substitute motifs.
4. **Plan seven beats.** arrival → choice → resource_image → non_directive_exploration → supportive_choice → return_to_here → closing. One central image with smooth transitions.
5. **Pick one voice-friendly literary style.** gentle_simple, grounded_practical, poetic_contained or contemplative. Do not make the text a list of positive slogans.
6. **When using a small LLM**, compile a short locale-specific System+User pair for one piece. Target about 52 words per call, maintain only the last accepted 150 characters as continuity, and never expose a full client profile. Use createSmallModelBeatWriter and run each chunk through reviewNarrationSegment.
7. **Handle selected personal phrases carefully.** Exclude by default. Only a trusted private/owned model path with separate opt-in may receive a short allowlisted client phrase. Never send client profiles, diagnoses or personalized notes to an unpaid external Gemini endpoint.
8. **Review after writing.** Separate hard safety flags from literary review: coherence, natural speech, smooth pacing, non-coercive language, absence of repetitions, alignment with the chosen goal. Reject prohibited content immediately; at most one technical retry for malformed or undersized output.
9. **Distinguish text from audio.** A text draft has audioAssetId=null, rendered=false and published=false. Speech pauses and TTS duration remain estimates until actual approved audio is rendered.
10. **Report evidence, not intention.** Demonstrate tested output and links to code/PR. Do not claim a working Ollama server, MP3, successful CI, live model or published course without verifying them.

## Literary standards

- Write original, kind, measured language for listening aloud.
- Avoid mandatory eye-closing, breath pacing, touch, fixed symbol meanings, absolute affirmations and treatment claims.
- Use one central image, 1–3 connected rhetorical techniques, and short to medium spoken sentences.
- Add sensory detail only when it is permitted and not overstimulating.
- Respect client choice and leave room for no image/no particular feeling.
- End with a clear, gentle return to present surroundings.
- If a story becomes clinically complex, abstain from self-guided creation and request qualified review.

## Code route (small local model)

The current project already has an owned Ollama gateway but production access is not confirmed. Use:

    prepareMeditationCreativeBrief(...) -> brief_ready
    createOwnedSmallModelWriterProvider({endpoint,model,bearerToken})
    writeMeditationDraft(prepared,{writeBeat}) -> draft_review_required

For fully private offline authoring, the model must actually run locally, without external network calls; do not assume browser voices are offline. Model options to evaluate: qwen3:0.6b, qwen3:1.7b and qwen3:4b-instruct. For 5–15 minute scripts, use a durable worker/queue rather than a synchronous Vercel function.

## Evaluation

At minimum test RU/EN/ES, four styles, safe and clinical motifs, noImagery/consent rejection, prompt injection, explicit negative preferences, unsafe output, model timeout, and honesty about estimated narration length. Manual native-language literary review is required before declaring the scripts production-ready.
