# Holistic Intelligence — Self-Improvement 1.0

**Status:** feature behind explicit Production gates; deployment, schema application and live acceptance must be verified separately.
**Owner:** Holistic House / Holistic Intelligence.
**Refs:** [#4367](https://github.com/andylitvinov-design/books/issues/4367),
[#4361](https://github.com/andylitvinov-design/books/pull/4361),
[#4428](https://github.com/andylitvinov-design/books/pull/4428),
[#4429](https://github.com/andylitvinov-design/books/pull/4429),
[#4528](https://github.com/andylitvinov-design/books/pull/4528).

## Baseline, without confusing research and LIVE

- Native Secretary remains the existing first-party lightweight classifier, not a second LLM.
- The RU/EN versioned inference artifacts, locked historical synthetic gold tests, disjoint-training guard and optional native server dialogue state were previously shipped as code in #4528.
- Qwen quality tests and LoRA/SFT are **research** until a separate reviewed artifact/release is approved. This change never trains or deploys Qwen.
- My Coach currently has a separate eligible free third-party generative route. Do not mislabel its answers as Native Secretary.
- Telegram Business orders are processed in the **existing** CRM. Do not spin up a second CRM.
- Historical #4528 reported RU and EN research scores are not independently measured LIVE chat-quality deltas. The new dashboard starts with **no prior telemetry**.

## End-to-end observatory

1. Messenger and Services: user sees an unobtrusive **Helpful / Not helpful** rating after a visible assistant answer. Services is attributed to its site route; no message text accompanies the rating.
2. My Coach: a separate inline voluntary rating after a coach answer. The model cohort is explicitly **external / unattributed**.
3. Telegram Business: only signed, recent, customer-originated private Telegram Business messages containing an exact voluntary command may be counted:
   - EN: \`/quality helpful\`, \`/quality unhelpful\`
   - RU: \`/оценка полезно\`, \`/оценка не помогло\`
   - ES: \`/calidad util\`, \`/calidad no util\`
   Normal conversation, service orders and CRM confirmations do **not** imply analytics consent. Existing HMAC rate buckets deduplicate signed update IDs without storing Telegram identities in learning tables.
4. New server endpoint \`POST /api/holistic-agent/quality\`: same-origin, small strict payload, per-IP HMAC rate limit, user-initiated positive consent, no arbitrary fields. Web clients cannot forge the Telegram channel.
5. \`app_private.hi_learning_quality_daily\`: only date, source, locale, an enumerated quality signal, algorithm **cohort** and daily count. No transcript, prompt, message, user ID, email, IP, phone, token, profile, file, voice or psychotherapy content.
6. \`/admin/learning\`: existing protected owner session; daily totals and RU/EN/ES groupings; unknown/unavailable rendered as unknown, not a zero. An empty \`hi_learning_release_decisions\` table is reserved for independently verified owner release receipts. No public statistics or user drilldown.

**Attribution caveat:** messenger/services may route through rules, Qwen or Native Secretary; the observatory uses mixed-route cohort labels until a trusted per-turn receipt exists. It is incorrect to report these counts as specific Qwen or Native classification accuracies.

## Enable / disable safely

- Apply the additive migration \`20261113225700_hi_learning_observatory_v1.sql\` using the existing verified Supabase migration process. Check applied migration and \`hh_app_backend\` RLS permissions.
- Set Production \`HH_LEARNING_OBSERVATORY_ENABLED=true\` and \`NEXT_PUBLIC_HH_LEARNING_OBSERVATORY_ENABLED=true\` **only after** the migration succeeds; redeploy only under the current protected release policy. Missing flags default to OFF.
- To stop all learning data writes, set \`HH_LEARNING_OBSERVATORY_ENABLED=false\`. Hide UI ratings on the next approved deployment by also setting \`NEXT_PUBLIC_HH_LEARNING_OBSERVATORY_ENABLED=false\`.
- Do **not** conflate this with \`HH_NATIVE_DIALOGUE_STATE_ENABLED\`: that optional state requires its own #4528 migration/approval. There is no second conversation state in this PR. Native inference rollback remains \`HH_NATIVE_RU_EN_MODEL_ENABLED=false\`, restoring the existing first-party fallback.

## Offline candidate evaluation and promotion

Explicitly invoked on a trusted machine or ephemeral CI job, not on a long-running personal computer:

\`\`\`bash
node --test tests/hi-learning-observatory.test.mjs tests/native-dialogue-state.test.mjs tests/native-dialogue-events.test.mjs tests/assist-telegram-business-request.test.mjs
node scripts/hi-learning-candidate.mjs --output-dir /tmp/hi-learning-review-001
\`\`\`

- Reuses \`train-native-ru-en-offline.mjs\` and its deterministic first-party RU/EN v9/v8 datasets, the existing immutable published gold fixture and train/holdout disjointness checks.
- An additional synthetic \`hi-learning-independent-v1.json\` contains independently authored RU/EN cases and 4-turn conversation scenarios plus ES and Telegram controls; it is separated from training and checked for exact and near-duplicate leakage. **Its mere presence is not evidence that the model passed a full live dialogue.**
- Output contains a versioned model artifact per language (with hash/provenance), a comparison report, explicit safety/false-accept counters and a **BLOCKED** candidate decision until full independent dialogue replay, Telegram signed-order E2E, safety verification and human semantic review provide actual receipts.
- Candidate gate rejects: insufficient measured cases, any RU/EN macro-F1/accuracy regression, new OOD false accepts, ES drift, safety failures, unverifiable holdout/data policy, missing human signoff or no measurable improvement. Passing a numerical comparison yields only \`ELIGIBLE_FOR_PROTECTED_REVIEW\`, never a model mutation.
- Private customer conversation content is not ingested by any training script. Even explicitly opted-in quality ratings are **aggregate statistics**, never training rows.
- Changing a model's pinned version is a separate protected one-PR deployment after explicit review and a verified LIVE regression test. Preserve previous artifacts and the existing kill switch.

## LIVE acceptance — do not mark complete from GitHub merge

1. Current PR exact-HEAD Core, Specialist, Guard, App R1 and applicable checks pass. No repeated pushes solely because production advanced.
2. Confirm protected merge of this PR, ancestor SHA of the deployed production alias, migration success and both flags.
3. In normal website and Services flow, tap **Helpful**; verify exactly one daily aggregate change without any stored text, and no new row for no opt-in.
4. In My Coach, tap **Not helpful**; verify separate model-attribution cohort, no exposure of its conversation.
5. In a signed Telegram Business customer chat, send a single \`/quality helpful\` and then retry the *same signed update*. Verify first increments once, retry increments zero, normal service intake still works.
6. Open \`/admin/learning\` in an owner session and confirm RU/EN/ES sources, daily counts and release decisions; confirm guest access is denied.
7. Simulate a candidate regression and verify the gate blocks promotion. Restore prior model through the existing kill switch in a controlled rollback drill.

**No new mandatory paid provider, LLM, GPU, CRM, n8n workflow, cron, trainer daemon, CI pipeline or automatic deployment.**
