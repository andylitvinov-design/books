# Existing Telegram service Secretary: no external AI key

Published 30-option and legacy selected service intakes are deterministic and use no OpenRouter model call. Previously their public CTA and signed V3 provider path required `v3CanStart` even though `aliGuidedIntakeTurn` and `aliGuidedIntakeSummary` are first-party. This patch exposes `v3ServiceIntakeReady` using existing production V3/schema/feature checks without a model API key.

Retain signed webhook validation, live Telegram bot transport identity, separately consented session, encrypted bounded context, STOP, safety, idempotency, deliberate client-reviewed Send and exactly-once CRM finalization. Psychologist mode continues to require `v3CanStart` and external AI opt-in. Public status reports serviceInterviewAvailable separately from aiInterviewAvailable. Published RU/EN/ES service intro truthfully states no external AI is called.

No additional provider, token, secrets, migration, webhook, price, payment, CI job, Vercel deploy or schedule. Protected PR merge then only existing hourly production publisher. Physical second-account Telegram-to-CRM delivery proof is still required.

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES.
