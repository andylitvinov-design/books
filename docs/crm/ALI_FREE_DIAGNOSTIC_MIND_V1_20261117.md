# Holistic House · Ali Free Diagnostic Mind v1
Date: 2026-11-17. Status: first-party source implementation; production + physical Telegram acceptance are separate.

## Purpose
One named client-facing AI assistant Ali, with an explicit FREE_DIAGNOSTIC role for the already-existing Telegram V3 free situation review (/start hhreview_ru, /start hhreview_en, or alias /start hhdiagnostic_ru/en). This is an optional, conversational intake and factual preliminary situation review — NOT a medical/psychological diagnosis, not divination or a photo energy scan, not a therapy session and not a promise of results.

The existing modes remain different:
- Secretary Mind: identify a specific need, answer published service questions, support a request; do not force exploration.
- Free Diagnostic Mind: a voluntary 4–7-question focused interview with useful brief reflections and a client-confirmed summary.
- Secretary Psychologist Mind: separately opted-in, more sensitive 7-depth conversation with its own consent and more restricted transfer.
- Sales Mind / Coach Mind: independent trigger and stage policies. A person in distress is NOT automatically in sales or coach mode.

## Entry, consent and end states
1. User selects Free Diagnostic on the published free-review page, opens an official V3 deep link, or taps Personal Consultation > Free Diagnostic in Telegram menu.
2. The same webhook checks Telegram signature, official bot, provider readiness, account, rate limits, STOP, and user's explicit consent before retaining answers. This mode does not call any extra language model.
3. On consent the server stores free_diagnostic + goal stage inside its existing encrypted V3 context. No new database or permission.
4. The native free-mode Stage Planner answers a single incoming message: identify purpose; recognize quick question, distress, refusal, uncertainty, skip, correction, crisis; do not call a model or invent a user fact.
5. After a meaningful answer, advance to the NEXT UNANSWERED phase. Do not advance for FAQ, greetings, referral, ambiguity, first-time apology or ordinary doubts.
6. The user may skip, pause or finish early, and may answer all fields in one message. On completion the existing Finish interview button opens a factual draft. Only the separate Send for personal review action transfers that approved draft to the existing encrypted CRM thread and practitioner.
7. No marketing opt-in, paid order, booking, third-party billing or personal medical diagnosis is implied. The human reply time remains unconfirmed.

## Six-stage compact question library
Each stage has three reviewed question variants, in RU/EN/ES (54 standard question alternatives). Pick ONE unused variation according to what the client already said. Do not rotate blindly or stack three questions into one message.

| Stage | Aim | Typical RU question | When to skip |
|---|---|---|---|
| Goal | Desired result | Что вы хотели бы понять или изменить? | Goal already explicit, or explicit skip |
| Challenge | Principal obstacle | Что мешает больше всего? | Already clear, or explicit skip |
| Situation | External/current facts | Что происходит сейчас и с чего всё началось? | Client already described it |
| Impact | Most affected area | На чём это сказывается сильнее всего? | Too sensitive, answered, or skip |
| Attempts | Past attempts | Что уже пробовали? | Already told, unknown or skip |
| Support | Existing resources | На кого или на что можете опереться? | Client doesn't want depth, answered or skip |

Usually no more than 6 focused questions; can finish after the first substantive fact. The assistant NEVER treats turn count as proof a phase is complete. Skip produces a missing field rather than a fabricated answer. The earlier Secretary three-stage goal–challenge–situation intake remains available for non-diagnostic service enquiries.

## Scenario and response catalogue
The public short response language should sound human and minimal. Always ask ONE question at most and prefer not asking one at all when the visitor wants a pause, sends private/safety content or reaches review.

| Client wording or action | Recognition / role rule | Response policy and next step |
|---|---|---|
| Hi / Привет | Greeting, not a goal | Brief welcome, current-stage question |
| "My happening life" | Unclear request | Ask what they want to understand/change, preserve empty goal |
| "I got this link from meet up app" | Referral source | Thank them, record source as their words, ask one actual goal |
| "Sorry, it is my first time" | Newcomer | No apology needed; let them use their own words; one gentle question |
| "Lots of negative events in my life" | Self-reported difficult circumstances | Tentatively acknowledge; store as situation, NEVER as desired goal; ask what they want to change |
| "I feel lost / anxious / overwhelmed" | Feeling, not evidence of disorder | Gentle reflection; ask a simpler outcome question, do not promote a paid offer |
| "My goal is career clarity" | Goal | Record verbatim, advance to obstacle |
| "What makes that difficult?" | Client question | Clarify what the intake needs; keep original phase |
| "So what information would you exactly need?" | FAQ intake requirements | Explain goal, obstacle, situation suffice; no fake submitted goal |
| "photo scan reading?" | Photo / energy claim | Explain that photos cannot reliably reveal health/energy/causal situation; no interpretation or compulsory image |
| "Pls chk my energy" | Same | No psychic or medical claim; return to verbal description |
| "You are therapist or physic?" | Identity clarification | Ali is a digital assistant, not a doctor, psychotherapist or psychic |
| "What is this going to cost?" | Free intake versus booking | Free preliminary review; paid consultation is separate and is not booked |
| "Who will see my answers?" | Privacy question | Encrypted conversation; only separately approved summary to practitioner; don't request sensitive attachments |
| "How many questions?" | Process question | Short flexible set, finish early or skip |
| "I don't know" | Uncertainty | Rephrase once for this stage, skip on second uncertainty |
| "Skip question" button | User-controlled skip | Advance without storing an invented client answer |
| "No advice, please" | Explicit boundary | Acknowledge and ask only an optional relevant clarification |
| "No more questions" | Stop depth | Offer a factual early review without a new question |
| "Start over" | Explicit restart | Clear only free-mode stage/facts, keep verified identity and consent |
| "Change this: Goal: ..." | Explicit correction | Replace only specified user-authored field before summary |
| "I want to talk to a person" | Human handoff | Offer early summary/review; never pretend the human answered already |
| "I want to die" / chest pain | Safety override | Central safety response with urgent human help; no intake progression or external model |
| Photos uploaded in bot | Unsupported private attachment | Existing separate photo guard, explain that a picture is optional only through an approved secure channel |
| Six labeled answers in one turn | Multi-field answer | Parse only explicitly labeled facts, skip all filled stages, show Finish |
| Acknowledgement after Ready | Additional detail | Keep short client-authored note, never re-open the questionnaire automatically |
| Finish interview | Explicit review request | Show client-visible factual summary and independent Send/Edit/Cancel actions |
| Send request | Explicit approval | Existing protected CRM submission, no fake booking or payment |
| STOP | Suppression | Existing durable STOP and consent revocation; no further automated dialogue |

## Summary data model
Only allowlisted self-described and bounded text is saved, and only inside the existing owner-encrypted V3 context:
- free_diagnostic mode; goal/challenge/situation/impact/attempts/support/notes/source slots; optional retryStage and current stage.
- Do not store diagnostic scores, facial profiling, inference about trauma or symptoms, personality labels, diagnoses, sexual history, medical records or unauthorized image content.
- Final summary is explicitly titled "Preliminary review — in the client's own words" and names each present field. Do NOT fill missing fields with guesses. Keep to 900 characters and show to client first.
- Free review submits only approved summary, not the raw confidential turn history. STOP empties context and blocks future AI.

## Qualitative acceptance
- Single questions, usually 1–3 short sentences, responsive to answers; no repetitive questionnaire walls.
- Short or off-topic client questions receive direct answers without losing their place.
- "I don't know" does not force disclosure.
- Multi-field answers immediately reduce remaining steps; skip is optional.
- Do not demand photo, medical records, a drawing or a Google Form. The optional drawing "Me — Goal — Obstacle" can be requested only via a verified secure method, not invented in Telegram.
- Safety and user refusal precede all conversational logic.
- Existing home menu remains six compact main options. The Free Diagnostic button is only added as a second-level choice of Personal Consultation, so the approved six-card menu is not stretched.
- RU/EN menu, ES backward-compatible V3 responses.
- 2 independent technical gates: GitHub exact-HEAD protected CI + real Production served SHA. Physical second Telegram account acceptance: /start → consent → 3 messages → skip → Finish → client review → Send → CRM + owner notification → STOP. Production Business personal @holistichouse still separately gated and NOT enabled by this code.

## Cost and release
Only reuses current signed Telegram CRM, owner-encrypted Supabase, pure functions, existing hourly Vercel production pipeline. No new paid AI provider, model, bot, database, scheduler, preview or manual paid deployment. Preserve Pro $20 monthly cost guard.
