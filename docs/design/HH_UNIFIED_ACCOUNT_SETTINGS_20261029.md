# Holistic House — единый профиль и настройки (29 октября 2026)

## Scope and existing owners

**Production target:** `andylitvinov-design/books`, branch `codex/public-book-library`, project `super10/codex-public-book-library`, canonical `https://holistichouse.vercel.app`.

**Owner's reference:** submitted 29.10.2026 mobile screenshot of `/ru/holistic-support/mobile` with the bottom five-tab bar and a small **Язык и приватность** sheet. Private owner image is **not** committed to the repository.

The user expects one **Настройки / Settings / Ajustes** entry for Google registration, editable name, connected email, locale, timezone, selected interest, contact phone, notifications, optional message consents, subscriptions and payment controls, install, privacy and data export.

**Canonical data owner:** the existing private `/{locale}/app/settings`, via `AppWorkspace`, `app/api/app/[...path]/route.js`, `createAppRepository`, and Supabase Auth + `app.accounts`. Do not duplicate account tables or private CRM profiles. The screenshot photo and sliders are temporary on-page data: they **must not** silently become account data. Private test results and medical details must never appear in phone push notifications.

## Screen identity and navigation map

| Entry | Trigger | Destination and behavior | Auth |
| --- | --- | --- | --- |
| `/{locale}/holistic-support/mobile` | Bottom Settings tab | Scrollable unified settings menu, preserving public EN/RU/ES picker | Guest-safe |
| `/{locale}/holistic-support/mandala` | Bottom Settings tab | Same shared menu with mandala-specific language return | Guest-safe |
| Either public menu | Personal details, notifications, contacts, subscription, privacy | `/{locale}/app/settings#hh-settings-*` | Google sign-in, private Cabinet |
| Either public menu | **All settings** | `/{locale}/app/settings` | Google sign-in, private Cabinet |
| Private Settings, signed out | Continue with Google | Verified PKCE OAuth `continueTo=settings` | Explicit Google authentication |
| Newly registered user | Adult + necessary data-consent, name, locale, timezone, chosen interest | Same account onboarding API; no unconsented marketing | Explicit action |
| Existing user | Save form | Existing account-owned `preferences` API, followed by refresh | Signed in |
| Owner/practitioner | Practice profile settings | Remains separate from private client account | Practitioner authorization |

The physical Apple/Android home-screen install prompt, push settings and messenger options retain their existing separate server-backed components, mounted **once** under the settings hub. Checkout remains gated by existing provider availability and verified payment state.

## UI structure

1. Compact identity header with server-verified Google email and editable name; no invented avatar or verification status for SMS.
2. Shortcuts for **Personal details / Notifications / Contact / Membership / App / Privacy**.
3. Name, timezone, EN/RU/ES, chosen interest, separately consented marketing.
4. Native/Web Push plus messenger notification preferences (neutral alerts only).
5. Optional encrypted contact phone, message opt-out and marketing consent.
6. Existing subscription and available payment controls.
7. Install and app notification controls.
8. Data export, sign out all devices, deletion request (requires typed `DELETE`).

The public popup stays lightweight and guest-safe: it contains section links and language selection, **not** an API call that reads Google profile data before authentication.

## Backend/data

- Reuses verified server session, `accountLock` and existing `app.accounts` row, no new sensitive tables and no changes to CRM profile access.
- `ui_locale` constraint expanded additively from EN/RU to EN/RU/ES in `supabase/migrations/20261029194000_hh_account_es_ui_locale.sql`.
- Validation in `onboarding` and `preferences` accepts ES; Google OAuth return allowlists ES only for supported destinations (Settings included) and preserves `continueTo=settings`.
- Google email comes from authenticated server bootstrap (`data.email`) and is read-only in settings.
- Onboarding now actually sends edited `displayName` and `goal` to its existing API rather than dropping them.
- The language of an existing **test instrument** must remain tied to its original assessment version; preference changes only the UI locale.
- All actions remain opt-in, production delivery of push/SMS requires the provider and a device-level receipt, not merely a click.

## Acceptance and status gates

| Gate | Required evidence | Status at authoring |
| --- | --- | --- |
| Code and parser | TSX/JSX parse, eslint, TypeScript, tests | CI pending |
| Public mobile | Chromium/WebKit at 320, 390 and 430, EN/RU/ES; menu open/close, link and locale checks, no horizontal overflow | GitHub browser workflow |
| Auth | Synthetic pinned Google OAuth verifies EN/ES settings return | GitHub CI pending |
| Private settings | Authenticated synthetic account: save → reload → owner-only read, sign-out, notification, subscription controls | E2E pending |
| DB | Postgres check constraint allows EN/RU/ES, RLS unchanged | Verified via `pg_get_constraintdef` 29.10.2026 |
| Production | Vercel READY for production SHA, canonical-domain loading and real owner click | Not yet verified |

**Privacy:** No screenshot owner data, personal emails, health information or authentication tokens in CI artifacts. Do not use a private client account for automated QA. Never treat a button, HTTP 200, or green mock check as confirmed external message delivery or payment.

**Known external risks:** Real user OAuth and phone-push display need an authorized device/session and the delivery provider. Legacy client records and practitioner CRM profiles retain their separate permissions.
