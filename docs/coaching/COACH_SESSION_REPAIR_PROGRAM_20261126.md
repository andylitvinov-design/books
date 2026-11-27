# My Coach — owner correction programme, 26 Nov 2026

Incident: Genie UI reported Introductory session / WOOP, 53 exchanges and 0 minutes; screenshot also showed "sad" as a verified name, session-interface command as a wish, and mismatched status. Production f91aa1e contains #5733; Clarity #5701 was still draft. Do not claim the private transcript was inspected.

## Implemented on the draft
- Shared live extraction veto for explicit session-interface commands and feedback; keep literal transcript, historical reviewed quotes and true refusals separate. Emotion words cannot become an unqualified name. Open-ended bare yes/no and invalid names are not captured as a field. The legacy opening remains positional until the question-delivery adapter is deployed.
- Approved six visible Day 1 groups from scenario v5, with explicit open rows for fields not wired into the current persisted v2 ledger. Do not count missing fields as verified. Solid grey/yellow/green bars; minute marks independent. Preserve older actual fields rather than silently reclassify them.
- Keep wheel permission pending during the verification window; conditional consent field support in the existing deterministic validation gate. Explicit decision, question/delivery/answer IDs and durable ACK required before opening dependent rating fields; refusal/defer skips the question loop without fabricating answers. The v5 field specification is staged; not yet connected to the encrypted course-review persistence adapter.

## Release blockers — keep draft and existing transport veto
1. Reconcile branch against latest protected production; preserve all merged coach fixes, compare #5707 for unique changes.
2. Persist a versioned v5 question/consent/answer/verification ledger using the existing CAS archive. Adapt opening to contact + continuity + explicit start. Wire actual chosen course and version through every entry, transcript, prompt and saved result; prevent implicit persona-method fallback.
3. Connect the existing gate's conditional method decision to the server-issued question adapter. Include verified current-only ratings, partial wheel, exact summary review and client corrections in the same ledger. Unasked/unverified remain open. No new parallel gate.
4. Implement trusted provider/Director observations for explicit start/resume, connected active time, pause/disconnect/coach change, remaining grant and all-entry daily quota; never accept browser claims as quota proof. Shared timing is not the browser minute ruler; do not enable old single-token grant. Use existing protected encryption and CAS; migration review and RLS/independent-account tests required.
5. Reuse same logical session and author identity across personas, restore pending question and approved historical data only with consent.
6. Render the same versioned ledger in expanded tracker, final summary, PDF and Daybook. Homework only after trusted normal timed end and explicit client acceptance; no automatic homework on interruption.
7. Native CI exact head, real signed-in iPhone EN/RU/ES Basic/Pro and all-persona routing, eight-minute disconnect/resume, cross-account and duplicate quota tests; verify canonical LIVE deployment and functional session after protected merge. No new paid provider or manual deployment.

Calendar-day timezone remains a proposed UTC policy, not owner-approved. Never downgrade privacy/entitlement protections to make a green status.
