# Dialogue Coherence v1 — Holistic House / Video Conversation Mind 2.0

**Issue:** [#3139](https://github.com/andylitvinov-design/books/issues/3139)  
**Scope:** Existing Messenger AI/Chat and single canonical Video Director.  
**Date:** 2026-11-06  
**Architecture:** offline-first, RU/EN/ES, no new paid model/provider or second renderer.

## Corrected problem

A dictionary with 56 (or later 117) topical intentions can answer isolated questions but cannot by itself understand negation scope, corrections, conflicting options, multi-turn context or implied approval. This patch adds a **coherence layer before broad keyword matching**, not another FAQ list.

## Implemented decision order

1. Existing same-origin, verified identity, rate limiting, consent and full safety preflight remain authoritative. Urgent/human-review text cannot use the normal recommendation or video-creation fast path.
2. `interpretDialogueCoherence({message, history})` examines only a bounded current utterance and the last six optional turns, using **only user utterances** as evidence of a selected medium. Its acts are `none / choose / switch / reject / correct_topic / ambiguous`. Never infers consent, diagnosis, payment or video approval.
3. Corrections have precedence over old options: “не видео, а медитацию” means meditation; “not about love but about work” changes the goal to work; “video or meditation” asks **one** clarification instead of choosing a branch. A refusal prevents inheriting the previous filter.
4. The canonical `resolveConversationFocus` uses only the affirmative corrected topic, and returns a clarification when it cannot confidently map it to a published goal. Current explicit choice wins over history and filters.
5. In Video Director, `extractVideoChatCorrection` scopes a final corrected option: “20 seconds, actually 30”, “9:16, no, 16:9”. Negated alternatives are not chosen. Contradictions, unsupported durations and multiple competing choices fail closed with no patch.
6. Canonical button and free-text choices use exactly the same taxonomy-validated state transition. A corrected ordinal such as “второй сценарий, точнее третий” can only select one of the real options under the currently selected parent. Changing category/topic still clears dependent ID selections; validated unrelated music/duration preferences stay intact.
7. Messenger keeps a single in-memory **one-step undo** snapshot for its video wizard; there is no saved private history, persistence, extra provider, or new render path. Reset clears the snapshot. A local `undo` restores only the most recent validated state; no approval or render.

## Non-goals and privacy

- No new model endpoints, paid calls, external prompts, raw-chat analytics, telemetry identifiers, DB schema or scheduler.
- No fabricated scenes, videos, booking, payments, health interpretations, test results or MP4 delivery.
- The existing optional semantic-model resolver remains OFF unless its verified free-tier/consent controls explicitly permit it. No implicit activation.
- No marketing popup or duplicate AI interface. Work is limited to parsing, pure state transitions and existing in-thread undo.

## Verification and acceptance

- Fixture `tests/fixtures/dialogue-coherence-gold-v1.json`: **272 synthetic real-language examples, 265 unique phrases**: 69 preserved FAQ examples, 18 preserved video examples, 89 corrections/negations/ambiguous turns, and 96 new scene/editor dialogue cases.
- `tests/dialogue-coherence-gold.test.mjs`: actions, positive topic correction, ambiguity, six-turn context, user-only history, validated IDs/button-text parity, one-step undo wiring, no silent render, no new I/O, and isolated lexical p95 check.
- The suite is imported by the existing `tests/video-chat-contextual-understanding.test.mjs` for CI. Run:
  `node --test tests/video-chat-contextual-understanding.test.mjs tests/holistic-agent-rule-dictionary.test.mjs tests/messenger-video-dialogue.test.mjs`.
- Goals: 100% expected on the synthetic gold set; 0 wrong-branch selections within the test; 0 unapproved renders; zero paid inference.
- A green Node suite alone is not real iPhone E2E. LIVE requires protected exact-HEAD Core + Specialist, merge, Vercel READY for merge SHA, guest/authenticated EN/RU/ES mobile send/reply at keyboard-open and keyboard-closed states, real canonical video handoff and actual MP4 QA. Do not claim these before observed.

## Why this is distinct from the dictionary PR

The 117-intent dictionary project expands **breadth**. This change builds **continuity**: what was negated, what was amended, which context survives, what needs clarification, and which approved real action is allowed. Both can operate together; new narrow rules are evaluated before broad keyword matches.
