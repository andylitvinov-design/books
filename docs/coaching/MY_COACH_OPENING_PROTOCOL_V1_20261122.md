# Holistic House · My Coach · Required Six-Step Opening v1 (2026-11-22)

Scope: Mira, Max, Sofia, Alex, Merlin, Harry. Public persona opening applies across RU/EN/ES and both the existing Groq/Gemini text and native Gemini Live transports. The original Director-owned GROW/TGROW/WOOP/OSKAR/etc. method remains independent and must not be renamed or marked completed by this opening.

## Contract and evidence

| Order | ID | Evidence source | Completion UI |
| --- | --- | --- | --- |
| 1 | invitation | Explicit client acceptance, including willing “maybe/let's try”; never silence or AI prose | Checkbox + light + very short chime |
| 2 | name | Client-chosen name, pseudonym or an explicit choice not to share; a prior name only with separate reuse consent | Checkbox, shared identity light |
| 3 | continuity | Continuing previous saved topic or new topic; automatically 'new' if none available | Independent checkbox; **no second lamp** |
| 4 | focus | User chooses challenge / goal / self-exploration (profile and tests) | Checkbox + light |
| 5 | feelings | Client reports feeling or chooses skip; reflect faithfully, without invented interpretation | Checkbox **only**, no lamp or sound |
| 6 | confirmation | Client explicitly agrees to begin selected focus | Checkbox + light; then Director method |

Four original question variants per persona, per stage, in EN/RU/ES: `app_private.coach_opening_questions_v1` (144 rows, 432 localized strings). Select one question per reply; a local first-party fallback exists if the catalog cannot be read.

Client refusal, stop, distress and safety always supersede the opening sequence. Respect an explicit NO and stop invitations; a later client-initiated YES may restart. Hesitation can be met with a single helpful clarification of time, trust, privacy, pacing, fear or whether they would rather stop, never escalating persuasion. Questions are not a forced demand for sensitive disclosures.

## Persistence and memory

The current tab holds the opening answers and checkboxes. The client can choose to save a reviewed session protocol to the existing account-encrypted archive; only then is the opening metadata durably stored. No hidden transcript archive and no automatic cross-session inference. Reusing a previously saved preferred name/topic needs a separate visible opt-in before the first user reply. The backend loads only the verified current user's own saved record. If no verified saved record exists, do not claim to remember it.

The UI projects checkboxes from bounded client-utterance evidence; the text endpoint recomputes the same evidence and answers opening questions without paying for a separate LLM call. Gemini Live adds a server-locked six-step instruction and server transcript checkpoints; a direct duplex audio model can still generate unapproved wording, so production acceptance MUST separately validate its audible behavior and interruption flow.

## Acceptance requirements

- Fresh RU/EN/ES visit: first intro ends in invitation, non-affirmation stays at step 1, valid yes → name, name → automatic new topic, focus → feelings, feelings skip → final confirmation, final yes → main method.
- Returning account with saved history: unconsented use is prohibited; consented session remembers only valid saved name/topic and offers previous/new topic. Corrected name wins.
- Lamps are precisely four: step 1, shared 2–3, step 4 and step 6. Six independent checkboxes. Step 5 gives neither tone nor lamp.
- All six personas retain different language/voice character styles and receive four source-authored alternatives per stage.
- Basic Groq, Gemini text, Gemini Live and offline safety fallback must not skip consent/stop behavior; no extra Google request for checkpoint. No new paid services, tokens, CI workflow, or Vercel deployment. 
- Preserve progress accordion, narration/microphone barge-in, selected voice catalog and PDF review/save consent.
- Required exact-HEAD Core/Specialist/RLS/browser checks, physical Safari audio and production alias SHA smoke are separate release gates. **Source merge alone is never LIVE.**

Implementation files: `lib/coaching/coach-opening-protocol.mjs`, `lib/app/coaching-brain.js`, `lib/coaching/gemini-live-free.mjs`, `components/my-coach-live-dialogue.jsx`, `components/my-coach-gemini-live.jsx`, `components/my-coach-opening-progress.jsx`, optional encrypted protocol metadata and the two additive database migrations.
