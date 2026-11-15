# My Coach · ephemeral session context (2026-11-15)

Purpose: preserve *client-authored facts* across a typical 20-minute voice/text session without a second model, transcript persistence, extra provider call or shared client memory.

- The current open tab keeps up to 96 displayed dialogue turns in React state only; no localStorage, sessionStorage, database or analytics transcript. Closing/reloading clears it.
- The existing 10-turn authenticated request window still prioritizes the most recent user/coach exchange and pins only the client's own active stated goal or explicit no-advice boundary.
- For older details falling outside that 10-turn window, the browser selects up to 3 **verbatim** client statements (goal, constraint, concrete example/value). It ignores assistant statements, duplicates and long or too-short entries. A topic switch or correction invalidates earlier notes.
- `sessionContext` is optional, max 3 strings of 8–220 chars. The server validates structure, consent and sensitive-content using the existing Coaching Brain validator. Older snippets go into a **quoted user-data message** with recent context, never the system prompt.
- Crucially, Coaching Director v3 **does not use these snippets for phase advancement, approvals, commitments, stage evidence, consent or saved plans**. The latest client turn has priority.
- Preserve Same-Origin/auth, Groq free/ZDR gates, OpenRouter ZDR free fallback, model cost caps, per-account limits, safety/stop handling and no-audio-retention requirements.
- The UI privacy text in RU/EN/ES discloses that earlier client excerpts may accompany later provider-bound messages after consent. Nothing is sent on page load.
- Regression gate: existing `tests/my-coach-generative.test.mjs` and `tests/coach-turn-window.test.mjs`, plus full protected release checks. Genuine signed-in, consented multi-turn iPhone acceptance is separate.
