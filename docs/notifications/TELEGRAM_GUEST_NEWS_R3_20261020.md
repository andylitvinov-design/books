# Telegram public subscriber phase — Holistic House (2026-10-20)

Tracking: https://github.com/andylitvinov-design/books/issues/1302.

This phase adds voluntary news subscription for visitors who do not have a private client account. It reuses the connected @andydotbot and the existing verified webhook.

The Contact page and /en, /ru and /es/subscribe/telegram offer the same subscription form. Marketing consent starts unchecked and explicitly names the purpose. A 15-minute random Start token proves Telegram ownership. The browser stores a temporary HttpOnly status cookie. Encrypted Telegram IDs are held in a separate private table, never mixed with CRM or health records. A chat's /stop command deletes its guest subscription and existing private Telegram link. General news delivery remains OFF.

Applied Supabase migrations: 20261020214705 (tables), 20261020215003 (trusted server role policy), 20261020215212 (365-day consent expiration). FORCE RLS is enabled; anonymous and direct authenticated database roles have no table privileges. A bounded retention job runs inside existing housekeeping, without additional schedules.

QA: source security tests, lint, Next.js build, RLS checks and exact Vercel production SHA. Live provider proof still requires the owner to connect the existing bot webhook from My Practice → CRM → Connections and a real subscriber to press Start. Then check Verified and STOP, followed by an owner-only test delivery. No provider success can be claimed from green CI alone.

Open dependencies: WhatsApp needs official Meta Cloud API/WABA, a sender number, approved templates and explicit budget approval. Guest news publishing requires its own opt-in-only campaign and owner release. No third-party marketing sends or clinic data are enabled by this phase.

Useful links:
- https://holistichouse.vercel.app/ru/app/practice?panel=crm
- https://holistichouse.vercel.app/ru/subscribe/telegram
- https://github.com/andylitvinov-design/books/pull/1421
