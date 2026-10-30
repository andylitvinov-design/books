# Goal Filter → free client Cabinet: UI & privacy delivery
29 October 2026 · Holistic House · EN/RU/ES

## Target and screenshot identity

- Owner source: components/holistic-support-goal-filter.tsx + .module.css, rendered by components/holistic-support-mobile.tsx on /{en,ru,es}/holistic-support/mobile.
- User-provided screenshot: mobile RU, goal editor scrolled to lower part of "Now → Want" (Energy) and fourth "What to include in recommendations?" checkbox fieldset. Screenshot is conversation-private and is deliberately **not** copied into the repository.
- Target: **remove entire fourth fieldset** and opt-out checkboxes, leave "Save" (local acceptance), "Next category", "Show recommendations" (all published formats) and "Reset". The **last** on-page card becomes the separate free private Cabinet/Google action, after Reset.
- Page identity: source route derived from actual React owner and screenshot content; browser screenshot identity gate **PENDING** until a viewport matched run.
- iPhone safe area: normal document flow, no sticky/fixed CTA; existing five-tab dock belongs to page shell. Check 320/354/390/430 CSS px and desktop 768/1440; no overlap, no horizontal scrolling, focus visible, reduced-motion.
- UI tone: existing beige paper surface, forest green dark text, emerald gradients for CTA, modest icon, short privacy message, EN base plus RU/ES.

## Actual behavior / protected data path

| User action | Guest path | Existing account path | Required server confirmation |
| --- | --- | --- | --- |
| Save category | Current in-page accepted values; no server or CRM writes | Same | Only local |
| Show recommendations | Existing local selected-goal guide, with all nine verified content formats available | Same | No implied lead, booking or payment |
| Bottom "Continue with Google & save" | Stages bounded validated selections in **same-tab sessionStorage** only on explicit click → POST /api/app/auth/start {locale, continueTo:cabinet} → existing Google PKCE callback → onboarding/consent when required → /{locale}/app/portrait | GET /api/app/auth/contact-profile confirms signed-in session → /{locale}/app/portrait | Once active, GET /api/app/development-goals → bounded POST with revision, preserving other goals → GET readback equality required → discard transient stage |
| Cabinet reopen | Protected Cabinet page displays selected sectors and saved "Now → Want" values | Same | Existing app_private.development_goals, owner scope, encrypted via seal/openSealed |

Privacy:
- No values, personal goals, amounts, photos or health markers in URLs, OAuth state, pixels, messages, Telegram, CRM or external providers. Google receives only standard OAuth scopes.
- A strict server-side schema bounds numeric values and option IDs. No diagnoses, implied assessment scores or medical efficacy claims; account row not practitioner contacts.
- Existing account and onboarding validation, same-origin POST checks and optimistic revision conflict protection remain unchanged. No SQL schema change or new table, no paid APIs.
- sessionStorage temporary transfer expires after 60 minutes and is cleared **only after successful private server readback**. An auth cancel, network failure or conflict does not claim a save; user can retry. Switching tabs/apps may lose this transfer; native Safari→WebView handoff is **not** covered by this web-only path.

## Acceptance evidence (do not mark without proof)

- [ ] Existing form shows 3 numbered steps, no fourth checkbox fieldset; Save/Next/Recommendations/Reset continue working.
- [ ] Cabinet CTA is physically last; no bottom dock overlay, keyboard and iPhone 320–430 checks.
- [ ] EN/RU/ES strings render and Google returns to the selected language, including ES.
- [ ] Guest Google OAuth, first-account consent, secure write, readback and account reopen with synthetic data verified on a real browser/device.
- [ ] Already-signed-in path, canceled OAuth, third-party cookie/storage disabled, 409 conflict retry, network readback failure, wrong account and expired handoff tested.
- [ ] Account isolation and encrypted DB read/write, no CRM side effects; no photos or history copied.
- [ ] Focused node tests, TS, ESLint, production build, applicable specialist checks, PR approval; Vercel READY exact production SHA and post-release live flow.

Status: **CODE IMPLEMENTED, CI AND E2E PENDING**. The PR and live deployment are **not** evidence of Google/DB E2E until a real session confirms server readback.
