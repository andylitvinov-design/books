# Holistic House Messenger: compact AI rail (owner-approved, 2 Nov 2026)

## Owner design decision
One mobile screen with **three actual, protected sections**: AI, Orders, Clients.
No large left conversation list, no second navigation footer. AI section includes
only a very narrow five-action rail on the left, and a full-width conversation
on the right. Approved source of visual direction: warm ivory, mint, lilac and
gold, sunrise header, compact lotus welcome, 16px input and generous tapping.

## Real integrations (no fake video or fake client messages)
- AI reuses HolisticAgentChat and existing /api/holistic-agent/turn, rule/device/owned
  modes and explicit consent. Rail prompts prefill the composer; **never auto-send**.
- Video tool opens existing protected public Video Director, where a video is
  rendered only after the confirmed workflow; no fabricated output in Messenger.
- Orders and Clients reuse the protected MessagesOrdersClients + MessagesHub.
  Existing message/send/consent boundaries and account-scoped APIs remain intact.
- Six-slot global mobile dock is the **only** bottom menu. Center AI/Chat links
  to /{locale}/app/messages?section=ai. The former editor deep link remains
  accessible in the AI workspace and stays fully functional.
- Existing query links ?section=orders, ?section=clients, ?order, ?to, ?tab,
  ?requestId continue working.
- No Supabase migrations, new provider keys, Telegram sends, paid features,
  clinical data copied to AI, or impersonated finished videos.

## Acceptance before LIVE
1. Exact-head Node contracts, ESLint, TypeScript, Next build, all applicable
   CI (including hh-merge-check), protected merge only.
2. Mobile Chromium + WebKit at 320, 354, 390, 430px: 3 tabs, exactly 5 rail
   actions, prompt prefill, actual submit / safe failure, only one bottom dock,
   overflow <= 2px, keyboard visible composer and Safari toolbar spacing.
3. Signed-in Orders/Clients continue to use real private data; guest access is
   guarded, no fake conversations, consented account boundaries retained.
4. Vercel production READY exact merged SHA on holistichouse.vercel.app,
   genuine route smoke /ru, /en, /es and physical iPhone once available.
