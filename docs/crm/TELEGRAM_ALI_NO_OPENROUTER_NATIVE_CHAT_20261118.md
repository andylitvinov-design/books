# Ali Telegram: native replies only, without OpenRouter

This change removes the shared OpenRouter adapter **from client-facing Telegram V3 dialogue**. Source-bounded first-party Wave (Conversation/Reasoning/Empathy/Secretary/Consultant) answers approved topics directly. If an operator explicitly configures an owner-hosted Qwen model with verified HTTPS/bearer credentials, its optional reply is reviewed by the same role-output guard. Otherwise the normal fallback is the existing native Wave reply, without warnings, provider-key dependencies or external network calls.

The chat greeting is RU/EN/ES and no longer promises OpenRouter processing. Existing signed Telegram webhook, opt-in, STOP, emergency reply, encrypted state, review-before-CRM Send, rate limits and owner attribution remain unchanged. No new model key, endpoint, paid service, webhook, migration or deployment is created.

**Scope and capability limit:** This does not claim unrestricted generative reasoning or knowledge of arbitrary facts. When first-party rules cannot safely answer, Ali asks one clarification or offers human follow-up. The voluntary native Secretary Psychologist is separately implemented in PR #5025 (not merged as part of this patch); media/form receipt verification remains tracked in #4918. Neither source tests nor a READY Vercel build prove a real Telegram reply/CRM receipt.

Protected source PR → native CI → exact protected merge → existing hourly Vercel publisher → independent provider and CRM acceptance. GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES.
