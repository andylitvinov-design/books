# CRM phone-first contacts (18 October 2026)

Owner CRM no longer requires an email for enquiries received via telephone or WhatsApp. At least one of email or phone is required. Phone is entered in **E.164 international format** (e.g. +14165551234); spaces, dots, brackets and hyphens are normalized, but no country code is guessed.

Phone and optional email are stored **inside the existing AES-GCM encrypted contact ciphertext** with owner/record AAD. A separate keyed HMAC phone_hash provides unique deduplication per owner without searchable plaintext. The legacy NOT NULL email_hash receives an unrelated id-specific keyed placeholder only when there is no email; it must not be mistaken for a verified email address. An email-present contact retains the original owner-scoped email hash. Existing records are unchanged and phone_hash defaults to NULL.

No automatic SMS, WhatsApp, Telegram or email is sent, nor is any phone marketing consent inferred. One-to-one email remains blocked until there is an actual address, recorded consent, confirmed email and the separately verified Resend account (see issue #980).

Source: `supabase/migrations/20261018184529_hh_crm_phone_first_contacts_20261018.sql`.
 QA requires validation tests, synthetic duplicate phone index check and exact-head production build. Do not migrate phone values from private client profiles, service enquiries or tests without client-specific disclosure/approval.
