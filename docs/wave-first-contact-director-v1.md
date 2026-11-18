# Ali / Wave Magic — First Contact Dialogue Director v1

**Status:** approved product scenario; implementation contract. This document is not evidence of production deployment.  
**Entry:** first contact from Home / Services / Tests / Telegram / return to an unfinished session.  
**Owner:** Alchemy Mind / Wave Magic Director. Public assistant name: Ali.  
**Minds:** common Empathy Mind, Secretary Mind, voluntary Secretary Psychologist Mind, Coach Mind, existing Sales/Consultant and trusted booking adapters.  
**Constraints:** first-party / native-first, no new model, provider, database, scheduling app or subscription; existing CRM and Telegram workflows; RU/EN/ES; one question per reply; no interrogation or forced sale.

## Core behavior

The director is a **state machine with evidence-based checkpoints**, not merely an instruction to a text model. Before composing every answer it:

1. Resolves language from the client's message and existing conversation context; preserves history and the scenario across a language switch.
2. Checks safety, stop, no-advice, selected service, correction, topic switch, and verified explicit intent.
3. Extracts only explicitly stated information into evidence slots. An answer to an earlier question also counts if already present. Do not invent facts, motivations or emotions.
4. Computes per-stage sufficiency on a 0–100 **internal scale** from evidence coverage and source reliability, **not message length**, personality inference or clinical certainty.
5. Chooses exactly one next move: acknowledge; one new question about the most important missing slot; transition to next stage; present two verified options; process a confirmed action; pause; or stop.
6. Before speaking, the shared Empathy Mind adjusts phrasing to be warm, short and nonjudgmental. Never reveal percent scores to the client by default.
7. Persists stage and minimally required evidence through an **authenticated, existing owner-scoped session**; a host must enforce trusted state transitions, turn idempotency, consent, rate limits and encryption. Never trust browser/Telegram-provided scores, stage or authorization.
8. A booking/order remains a draft until the **existing authorized CRM/booking host** confirms what was actually sent or booked. Do not substitute narrative text for an action receipt.

## Five stage gates

| Stage | Result wanted | Weighted evidence slots | Gate | What Ali does when insufficient |
| --- | --- | --- | --- | --- |
| 1 — Contact & acceptance | Clear reason for coming | user intent (70%), context/topic (30%) | **70%**; explicit intent alone can suffice | “С чем вам хотелось бы разобраться в первую очередь?” |
| 2 — Understand the situation | Specific problem in the client's own terms | situation (50%), main difficulty (30%), circumstances (20%) | **80%** (situation + difficulty), or client explicitly asks to proceed | Clarify the greatest missing component, without revisiting a known fact |
| 3 — Desired change | What improvement the client wants | desired outcome (70%), desired depth of work (30%) | **70%**; desired outcome sufficient, do not demand personal details | “Какое изменение для вас было бы самым важным?” |
| 4 — Match & select | Two legitimate tailored options, one chosen (or decline) | two catalog-verified options (40%), fit explanation (20%), client selection (40%) | **80%**, with a verified selection required before an action | Show exactly two relevant options with concise reasons and an optional free path where appropriate |
| 5 — Act & accompany | Verifiable result or explicitly chosen next step | chosen action (40%), receipt/verified completion (60%) | **100% for completed**; otherwise pending/paused, never falsely complete | Ask only missing logistics, obtain required approval, execute trusted host workflow and report actual result |

Weights and thresholds are initial product heuristics, **not calibrated scientific probabilities**. Review using anonymized, consented dialogue acceptance tests before treating numbers as performance statistics.

### Stage 1

Welcome the person, reflect what they actually said, capture topic and intent. Use entry page or selected service as **context**, not as evidence of an unspoken problem. A direct, unambiguous booking request for an already verified service skips stages 2–4.

### Stage 2

Use one follow-up at a time to determine: what is happening, what is hardest, and in which circumstances. Only optional deeper enquiry in separately consented Secretary Psychologist; do not solicit diagnosis/trauma details or request photos in Telegram. Ask for confirmation only if the paraphrase might change the meaning.

### Stage 3

Move from the problem to an achievable desired change. Distinguish brief support, a chance to talk, and deeper consultation based on the client's wishes. In Secretary mode, stage 3 may be fulfilled from the original message; never ask a redundant goals question.

### Stage 4

Call the **existing verified catalogue matcher**, not open-ended invention. Rank by stated problem, goal, condition, language, duration, level/depth, cost and availability. Show a maximum of two published recommendations, preferably including a useful free route when appropriate. Give a short reason for each; ask one practical choice question only if needed. Honouring “no advice” means no automatic suggestions.

### Stage 5

Keep the client in the same chat including Telegram. For a selected test or practice: start the trusted published resource and offer a suitable follow-up. For consultation: verify offering, request only necessary practical details, respect a separate purpose-specific approval, show preview, then use existing CRM/booking endpoint. Distinguish request sent from appointment confirmed. Refusal, pause or lack of slots produces a truthful pending/declined status.

## Evidence contract

An evidence slot is accepted **only from trusted server-side extraction** of the user's current or prior explicit text. A semantic extractor may help, but its output is a *proposal*, never authorization. Evidence should have a nonempty short value, source turn ID, source quote or verified reference, and quality in [0,1] representing explicitness/specificity. Ambiguous claims have quality 0 and trigger clarification. If the client corrects a fact, the newer explicit statement supersedes the previous one.

Sufficiency calculation: sum of weighted, quality-adjusted slots (0–100), rounded; subject to required-slot constraints. The score is **coverage of the current stage**, not a probability that the assistant is correct. Never make a diagnosis from a percentage.

Session state fields: version; revision; dialogue ID; stage; per-stage score and completed/skipped/paused flag; verified evidence with provenance; last question ID; answered and missing slots; clarification count per stage; confirmed language and mind role; last two verified offer IDs; selected action; action status; consent references (from trusted host only). Persist minimal summaries, not photos or exhaustive psychological records. Optional private summaries require separate consent.

## Clarification selection

- Prioritize the missing slot with the largest remaining stage weight, then conversational relevance.
- Choose a fresh wording; ask **one** short question (preferably no more than two sentences total).
- Never repeat already answered questions, and never interpret a short “да” outside the actual preceding question.
- Secretary: normally **at most two distinct clarifications per stage**, but fewer if sufficient; Psychologist: at most three, only with separate consent. Do not loop after the cap. Offer “продолжим с тем, что уже известно?” or a different route and await the client's choice.
- When the client says “не знаю”, accepts uncertainty, declines to discuss, asks to pause, or changes topic: respect the boundary. A stage may be marked **skipped** by explicit choice; never fabricate 100% completion.
- If the conversation already contains sufficient answers for later stages, the director advances without asking questions. If the user says “хочу записаться на ...”, prioritize validated direct booking.
- After a correction, re-assess the relevant stage and revise downstream matches rather than clinging to old recommendations.
- If the user asks a direct FAQ, answer it first; the stage can remain where it was.
- Always maintain safety/consent checks upstream of this director.

## Transition pseudocode

    turn = authorizedHost.checkSafetyConsentAndIntent(message)
    if turn.stopOrUnsafe: return authorizedHost.safeReplyOrHandoff()
    state = authorizedHost.loadSessionAndLockRevision()

    if turn.topicChanged: state.resetRelevantEvidence()
    if turn.hasVerifiedSelectedService && turn.explicitBookingIntent:
        state.stage = 5
    else:
        state.mergeExplicitEvidence(turn.trustedExtraction)
        stage = stageDefinition(state.stage)
        score = stage.calculateCoverage(state.evidence)
        state.record(stage, score)

        if score < stage.threshold || !stage.requiredSlotsPresent:
            if state.clarificationCount < stage.questionLimit:
                reply = director.oneUnaskedQuestion(stage.missingEvidence)
            else:
                reply = director.offerProceedSkipOrPause()
        else:
            state.completeCurrentStage()
            state.stage = nextRelevantUncompletedStage()
            reply = director.nextStageOpeningOrTwoVerifiedOptions()

    authorizedHost.atomicCommit(state, turn.idempotencyKey)
    return empathyMind.render(reply, locale)

## Example — real content, not chat length

User: “Меня пугает, что в отношениях я всегда уступаю и боюсь конфликта. Хочу научиться говорить о своих желаниях.”

The first utterance already establishes intent, situation, difficulty and desired outcome. Director can pass stages 1 and 3 without reasking, clarify only what matters for choosing a route, then recommend two verified options. No fixed “five questions in five turns”.

User: “У меня проблемы.”
Director: stage 1 score below threshold, asks one open question. “На работе.”
Director: stage 1 can advance, but stage 2 lacks the actual difficulty; asks what at work is hardest. “Меня постоянно перебивают на встречах.”
Director: recognizes a concrete situation and difficulty, then checks the goal or routes to choices when goal already stated.

User: “Запишите меня на расстановку.”
If service is verified, Director skips discovery and opens the **existing** Secretary order flow, never declaring a slot booked before a real confirmation.

## Acceptance tests before LIVE

1. RU/EN/ES full and partial responses, including two problems in one message.
2. Early 1→3 progress based on already supplied facts; no repeated question.
3. A one-word answer interpreted in relation to the current question.
4. Director rejects unverified model claims and hallucinated service IDs/availability.
5. One and only one question per message; limits on clarification loops.
6. No consent bypass into psychologist, memory, billing or booking.
7. No-advice, pause, stop, crisis, correction, midstream topic and language changes.
8. Two published suitable options, correct free/paid labels and prices, no unverified offerings.
9. Telegram/web continuity with server-owned session, revision/idempotency, and encrypted CRM handoff.
10. No extra cloud service or model needed; no deployment outside existing hourly production cadence.
11. Test on real mobile and Telegram before claiming LIVE.

## Implementation status / integration point

The production branch currently contains wave-native-router.mjs, wave-staged-dialogue.mjs, native-dialogue-state.mjs, the Secretary modes and encrypted native session store. These already implement partial multi-turn dialogue but do not by themselves prove this whole five-stage sufficiency workflow. Existing Secretary Psychologist logic has historically used message-count-based recommended depth; this contract explicitly replaces **completion by count** with **completion by evidence**, while keeping the old bounded mode's safety and consent. Parallel PR #5012 touches Telegram Secretary/psychologist order flows; integration must be reconciled with that PR rather than overriding it.

This document defines **the approved scenario and the acceptance gate**, not an independently deployed feature. No unconditional production claim is permitted until code integration, tests, CRM/Telegram checks and actual LIVE verification succeed.
