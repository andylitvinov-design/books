# HH Growth Studio — manual publishing inbox and honest completion ledger

**20 October 2026 — P2.3**

## Product behavior
The existing manual editorial calendar prepares content, but a manually placed post has no verified provider receipt. Never equate copying a caption, opening a social site, or an owner checkmark with verified publication.

This release adds an owner-only **To publish / К публикации** inbox to Growth Studio, with three due groups (Overdue, Today, Later) based on **America/Toronto**, plus a distinct **Manually marked done** counter. Each row displays the approved manual post, time, brand, channel, language, excerpt and public media.

User actions:
- **Copy post + safe UTM**: copies approved caption and verified public campaign link. This does not send to any provider.
- **Open publisher**: opens a constant official URL in a new tab. Unknown instance-dependent Mastodon/WordPress targets stay manual; no guessed accounts.
- **Mark manually done**: requires explicit confirmation of the full text and target. Server requires confirmed=true, owner session and optimistic revision. Record state changes planned_manual → manual_done with manualDoneAt UTC timestamp.
- **Undo manual checkmark**: restores manual_done → planned_manual using a new revision and removes the timestamp.
- **Verified published** (actual Telegram provider receipt) remains separate. The provider-confirmed counter never increments for self-reported manual_done.

## Security and acceptance
- Existing protected owner-only mutation; no new public API, auth fallback, marketing tracking pixel, new cron or provider OAuth.
- isSavedGrowthPost requires manualDoneAt canonical ISO UTC equal to the updated revision timestamp, and no provider delivery/attempt data.
- Only planned_manual can transition to manual_done, and manual_done cannot edit, archive or send without undo.
- Redis CAS ensures stale manual-done/undo actions cannot overwrite a simultaneous post change.
- Inbox groups are based on Toronto local day, not UTC, and exclude already manually completed/Telegram-published items.
- Existing ICS reminder export excludes manual_done; undo restores it to planned tasks.
- Unit tests cover queue dates, provider status separation, public UTM copy, fixed navigation URLs and admin action guards.

## Owner use once production is confirmed
1. Log in to https://holistichouse.vercel.app/admin/growth-studio .
2. Save and approve public reviewed content, then add it to the manual calendar.
3. Open К публикации / To publish, copy the text and open the actual social publisher.
4. Confirm account, media, exact text and publication **on the external platform**. Existing /admin/youtube-upload with verified RU/EN channel is the approved separate YouTube flow per video SOP #219.
5. Only after completing that external action, mark the task manually done. The app **does not verify** that a post exists. Undo if it was marked by mistake.
6. For real automated Publer-style scheduling, an authorized account, durable provider queue, provider post receipt and safe reconciliation remain required.

## References and QA gates
- Source of truth: https://github.com/andylitvinov-design/books/issues/1214
- Publer parity matrix: docs/growth-studio/PUBLER_PARITY_AUDIT_2026-10-20.md
- Video SOP: https://github.com/andylitvinov-design/ai-projects-brain/issues/219

Before release run tests/growth-studio-manual-inbox.test.mjs and the full exact-head Growth Studio JS/security/Next build workflow. Confirm current canonical production branch, Vercel READY + alias, real owner save/reload and iPhone/WebKit. Do not claim that manual_done equals verified published.

**No social posts, paid API subscriptions, ads or HeyGen renders performed.**
