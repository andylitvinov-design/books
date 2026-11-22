# Daybook Daily — random 30-day anti-repeat release delta

This adds no new sender, cron, provider, spending or opt-in accounts. It corrects the existing personalized #5420 Daily Message pipeline, preserving selected goal + one of eight meaning axes + explicit goal-text disclosure consent and Telegram verification.

The production-approved catalogue contains 142 distinct published text entries for each RU/EN/ES language (checked 22 November 2026). The editorial topic-to-axis filters in the SQL migration give 40–56 unique candidates for each of the eight axes, so there is no need to broadcast five repeating preview phrases. The five original phrases stay available for UI previews only.

At most one message can be claimed per account local calendar day: preference is row-locked, an approved phrase is selected using SQL random order, all past account-wide phrase IDs from the prior 30 local days are excluded regardless of send outcome, and both local-day claim and phrase ID commit before Telegram is contacted. An empty pool means no send rather than a forced repeat. Locale, goal and axis changes do not reset history. Selection is checked again before provider call; revoked, blocked, unpublished, changed goal or changed axis suppresses the message.

Database functions are private with existing worker role/JWT guard; browser and public roles cannot call the selected-phrase function. Keep production HH_DAYBOOK_DAILY_SEND_APPROVED off until protected PR CI, protected merge, additive migration, existing hourly Vercel publisher serving the correct SHA, and verified consenting-user Telegram provider test all pass. Do not enable WhatsApp outbound without Meta-approved templates and explicit additional consent.

Acceptance: day30 previous send excluded/day31 eligible, at least 31 consecutive days without repeats, concurrent workers at-most-once, DST/timezone, selected-goal consent, unknown provider acceptance never retried, no new sender, no extra spend. If uncertain, turn off the send gate without deleting audit history.
