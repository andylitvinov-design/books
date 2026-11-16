# Messenger guest entry — visual-to-code specification (7 Nov 2026)

Approved reference: owner's three-screen Messenger guest-entry mock in this ChatGPT conversation. It is a visual design, not a raster-image website.
Actual broken guest state: faint sign-in notices and raw SIGN_IN_REQUIRED in Orders, Conversations and News.
Canonical routes: /en/app/messages, /ru/app/messages and /es/app/messages with section=orders, section=clients and section=news. Matching role/view: guest in existing Messenger, never practitioner dashboard/editor.
Owning component: components/app/messages-orders-clients.jsx. Preserve four existing top tabs, header, one global dock, secure Orders/CRM/Briefing data and AI.
Reference map: top navigation → Messenger heading → natural photograph with context pill (160–193px) → overlapping cream sheet → section icon → dark evergreen heading → two sentence explanation → Telegram primary (only strict provider diagnostic link, correct review fallback) → WhatsApp secondary (existing manual public handoff) → explicit no-login disclaimer → user-invoked other login methods with existing Google PKCE.
Local assets: reiki-approved-sunrise-v3.webp, reiki-practitioner-sunrise.webp, ideas-zen-landscape.svg. Tokens: canvas #FBF5E9, surface #FFFCF7, ink #143D3A, border #E9DFD1, CTA #067A67.
Mobile: 320/354/390/430px, CTA >=52px, semantic headings, focus-visible, reduced motion and no automatic overlay. EN/RU/ES.
Behavior: Telegram bot entry is a manual initiation and consent, not website account authentication; WhatsApp link is a manually sent business enquiry, not authenticated identity, CRM save or delivered response. Only Google protected flow starts the existing Cabinet session. No webhooks, secrets, RLS, paid API or CRM data changes.
Local preflight: exact source replacement invariants checked. Hosted TypeScript, Node, browser visual screenshot/overlay, Safari interaction and real provider E2E still require confirmation before release claims.
GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES
