# Holistic House · Claim-linked express reports and private delivery (26 October 2026)

Tracking: CRM issue #985 and funnel issue #990.

## Reuse rather than duplicate
- Existing public service enquiry API persists one encrypted guest enquiry and contact transactionally in CRM. Even if CRM contact exists, every distinct saved enquiry is shown in owner My Practice → Requests and CRM → Overview. Repeated idempotent operation is still one enquiry. Never merge by name/phone/email.
- Existing signed 1-hour Free Express claim attaches an enquiry to exactly one verified site account. Unclaimed guest enquiries cannot receive private reports. Claimed account is separate from CRM contacts and clinical record.
- One encrypted practitioner_express_reports table handles an authenticated consultation or a claimed free enquiry, exactly one request reference. RLS checks master and client, client reads only published.
- Explicit Send makes a completed report visible in private My Reports + My Messages, records sent_at once. Retried sends never dispatch again; revoke removes client access.
- Optional Telegram is OFF unless dedicated verified client bot has account opt-in and HH_CLIENT_TG_SEND_APPROVED is true. Recipient and chat are server-derived, one-time claimed, rechecked before sending. Fixed external notice contains only generic HTTPS link to private Cabinet, never report details. Provider acceptance does not prove receipt.

## Release gates
1. CI: exact current codex/public-book-library branch, full focused tests, lint, build and diff. Apply the SQL migration to Holistic House Supabase before deploying new app, verify all grants and FORCE RLS.
2. Vercel READY, correct SHA + canonical domain. Public EN/RU/ES 200, private unauthenticated routes 401; iPhone 320/375/390/430, no overflow.
3. Owner E2E with two consenting test accounts: new free enquiry → CRM → secure Google claim → Create report → Save → Send → My Reports/My Messages → Revoke; wrong second account and other master 403/404, duplicate operation no second notification.
4. Optional Telegram physical test: verified bot, linked client opted in, provider acceptance + actual device receipt, STOP and suppression. Without proof mark external delivery BLOCKED. No paid API, campaigns or mass sends.

Rollback: feature app changes are reversible; disable outbound customer Telegram first, retain additive schema safely. Do not claim external delivery solely from CI or READY.
## 26 October 2026 · follow-up: Google-account claim with v2 media wizard OFF

The production free-review contact card can save a consented first-party enquiry before
the optional v2 details/photo wizard is approved. Previously, the separate safety flag
`HH_FREE_EXPRESS_V2_ENABLED` suppressed both media and the account claim, preventing
these existing enquiries from being linked to Express Reports.

This additive flow decouples ONLY the verified-account claim:
- The public `/api/service-enquiries` sets the existing one-hour HMAC HttpOnly
  SameSite=Strict cookie only after a confirmed saved enquiry for the exact
  locale-matched free-review service; never for other CRM contacts or services.
- The first-party `/api/free-express/claim` continues to enforce verified
  Google account, origin, contact consent, signed same-browser continuation,
  one account per enquiry and row-level client ownership. It may return the
  client's own claimed receipts after authentication; no public report.
- After a saved free-review phone enquiry, the visitor has an optional explicit
  "Save to my Google account" action. Same-tab OAuth resume retains only
  non-sensitive enquiry reference, locale/path and an expiring 10-minute marker
  in sessionStorage; no phone, questionnaire, drawing, medical data, bearer
  token or bot chat ID enters the URL or browser storage.
- `/api/free-express`, `/api/free-express/media` and all v2 private photo
  capture remain behind the original `HH_FREE_EXPRESS_V2_ENABLED` gate;
  this change does NOT activate them, outbound providers or marketing.
- Reports remain accessible only after an actual client account claims the
  correct free-review enquiry and the assigned practitioner explicitly sends.

Acceptance requires Source/Node security tests, typecheck, scoped lint,
production build, iPhone 320–430px EN/RU/ES read-only browser tests, the
canonical READY deployment SHA and a real consented client Google OAuth
test. A 200 homepage, cookie presence or signed-in owner alone is not E2E.
