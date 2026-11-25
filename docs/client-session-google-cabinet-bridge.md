# Client Session → Google Cabinet bridge (Oct 15, 2026)

## User-facing behavior

An individual consultation and prescription remain readable through the **session-only invitation** without requiring an account. A prominent "My Cabinet / Мой кабинет" button sits in the header of the private HTML prescription, styled with the existing warm paper, terracotta, Georgia and sage palette of Holistic House's Google Cabinet. A compact entry panel below the personal materials includes "Enter with Google", "My Tests", "My Reports" and "My Courses".

**One click behavior:** the app verifies whether the browser already has a Google Account session via the existing `/api/app/bootstrap`. If yes, it opens the selected existing account route. If the verified Account session is absent (401), it uses the existing server-side Supabase Google OAuth PKCE endpoint `POST /api/app/auth/start`, passing only the locale and a **fixed allowlisted** continuation label. After OAuth callback, the client lands on precisely the selected account section.

Continuation mapping:
- cabinet → `/{locale}/app/portrait`
- my-tests → `/{locale}/app/tests`
- my-courses → `/{locale}/app/course`
- reports → `/{locale}/app/portrait#personal-reports`

The original course/testing OAuth continuations, consent and PKCE callbacks remain unchanged. No user-supplied URLs, invitation selector, fragment secret, client name, report UUID or health data are sent through the Google redirect/callback. Failed sign-in displays a retryable error instead of claiming success.

## Security boundary / what "connected" does not mean

Guest session invitation ≠ Google account authentication ≠ account-level authorization to a legacy client. Opening the invitation does NOT automatically attach it to whichever Google account happens to be signed in. Merely signing into Google does NOT authorize the recipient to see the legacy Client's other consultations; those are protected by their own cabinet grant. A separate **explicit consent + verifiable session-level save/claim** transaction with one-to-one account binding, conflict rules, audit, revocation and security testing is needed before adding "Save this session to my Cabinet" as a real feature.

Likewise, the Account's "My Reports" area only lists reports already saved to that Google account, not every item reachable via independent invitation. Do not mislabel it "All my consultations" before a consented cross-system linking implementation exists.

## Design

Reuse the existing Google Cabinet visual design source `app/[locale]/app/[[...path]]/workspace.css`, not the PDF print styles: light ivory paper, warm dark ink, terracotta CTA, sage informational cards, rounded 16–23px panels, large Georgia headings, >=44px mobile touch targets. Reuse the underlying HTML prescription accordion, canonical real PDF, private audio/video and same scoped server-side authorization.

## Release gates and remaining work

- Verify production `HH_APP_ENABLED`, `HH_APP_PRODUCTION_APPROVED`, `HH_APP_SIGNUPS_ENABLED`, Google provider redirect allowlist and new-account signup through an isolated authorized end-to-end test.
- Private client pages still require `HH_CLIENT_DELIVERY_ENABLED=true` **and** a server-only `HH_APP_SUPABASE_SECRET_KEY` plus real-device session A/B / revoke / private-media checks. They remain disabled unless explicitly approved.
- Test iPhone Safari/Android Chrome guest link → Google new account or returning user → fixed Cabinet destination; test cancel/retry, report hash/# anchor and unknown OAuth continuation rejection.
- Do not publish private videos to YouTube or import personal source content into external Google without client consent.
