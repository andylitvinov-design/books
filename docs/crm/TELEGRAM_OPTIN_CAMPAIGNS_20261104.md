# Holistic House CRM · Telegram opt-in campaigns · 2026-11-04

## Release scope

One existing CRM and BotFather bot. Telegram personal responses are independent from optional news. PR #3410 preserves reply-only consent across diagnostic restarts, while explicit /stop or legacy /unsubscribe suppresses contact. Never infer a marketing subscription from a chat, Google signup, course enrolment or owner-recorded contact.

An existing, consented private bot user may **explicitly** send `/subscribe` (or its exact localized equivalent). A signed webhook writes marketing_opt_in_at and a provider-update-scoped append-only event. `/unsubnews` withdraws news only; `/stop` and legacy `/unsubscribe` withdraw both personal and promotional contact. Existing opt-in does not expire because the questionnaire restarts. A STOP remains sticky and may not be silently reopened.

The owner-only CRM Contacts → Subscriptions section shows Telegram opted-in audience by actual contact locale, approved immutable templates, saved drafts, delivery statuses and manual batches of at most **three** verified subscribers. Each recipient is rechecked immediately before sending and can receive a specific draft at most once, enforced by a database unique index. Unknown provider outcomes are preserved but never automatically replayed. Per-owner marketing reservations are capped at **30 per rolling 24 hours**; personal replies have their own independent quota. The Bot API payload explicitly sets `allow_paid_broadcast:false`.

WhatsApp, Instagram and Facebook Messenger broadcasts are **not activated**: provider-specific window/template permissions and potentially paid message delivery require separate owner approval and verified consent records. No new recurring task, cron, paid provider, AI copywriter, subscription tier, marketing list import or automatic campaign launch.

## Owner manual acceptance after protected CI and Vercel READY

1. Use a separate test Telegram user whose existing personal conversation is consented. Confirm CRM replies work after a 9-day-interval synthetic time test without client messages. Confirm that restarting the diagnostic does not clear permission.
2. Send `/subscribe` in the test Telegram chat. Verify one signed preference event and an audience count of one in the corresponding locale. An existing chat without this explicit opt-in must not appear in the marketing audience.
3. Prepare a test campaign from the owner CRM (template and locale), inspect message preview and unsubscribe footer. Check the explicit confirmation box; click **Send next batch**. Verify exactly one Telegram provider-accepted message and the same encrypted CRM thread.
4. Retry the same batch and refresh the page. Verify no duplicate to that recipient. An unknown/queued result must never be automatically retried.
5. Send `/unsubnews`. Verify campaign eligibility disappears while personal chat continues. Send `/stop`: verify all responses stop and new CRM campaigns skip the contact. Do not bypass STOP with a new campaign.
6. Check narrow existing RLS roles, replayed/out-of-order webhook updates, wrong owner account, iPhone RU/EN/ES widths 320/390/430 and no fixed overlays. Record actual provider readback; unit tests or Vercel READY alone are not delivery proof.

## Important

No existing customer has been subscribed automatically. Never send a real marketing campaign until the customer has explicitly subscribed and approved copy and consent evidence have been reviewed. Database migration 20261104141404 is additive and was applied before shipping frontend code; it cannot by itself send anything.

## Commercial sender identification · additive safeguard

Canadian CASL may apply to promotional instant messages. Existing opt-in and
simple unsubscribes are necessary but not enough: commercial messages also
need a verified-by-owner business/sender name, valid mailing address and
contact method. The owner must supply a public business mailing address in
the campaign form and explicitly attest that it can be disclosed to recipients.
A mailing address is not inferred from a client, profile or private file.
Any Telegram campaign draft without these fields fails closed on stats/send;
every new campaign includes the business name, mailing address, canonical
Holistic House contact page and explicit news/global opt-out directions.
This is not legal certification and the owner remains responsible for the
truth and ongoing validity of the contact information.

Reservations use a per-owner transaction advisory lock before counting the
30 messages per rolling day, so concurrent owner browser tabs cannot bypass
the daily free limit.
