# Holistic House · One private session → one Google Cabinet save

**Implementation:** \`codex/session-save-google-20261015\` · issue #585.

## User experience

- A session-only invitation remains readable without Google and grants no access to any other consultation.
- Recipient chooses **Save this consultation to Google Cabinet**, explicitly checks consent, then initiates an encrypted 15-minute browser-bound save intent.
- With an existing verified Account, the recipient sees a confirmation screen showing the destination Google identity. With no Account, normal Google OAuth + onboarding leads to the **same mandatory confirmation**, never an automatic save.
- After confirmation, the exact approved published session appears under **My Reports → My saved consultations** and opens at \`/{locale}/app/sessions/{savedId}\`; its HTML recommendations, permitted private media and genuine PDF use account-verified server routes.
- The item is not added until confirmed; saving does **not** bind the whole legacy client or grant access to unrelated tests, consultations, invoices or cabinet history.
- Recipient can **Remove from My Cabinet**. This hides only their reference; original client report and guest grant are unaffected.

## Security and lifecycle

- \`client_session\` extends the existing save_intents framework, signed HttpOnly same-browser proof, PKCE and idempotent commit. Originating viewer must be an active single-session share grant OR a still-valid legacy Cabinet for the exact Client + Session.
- A live published session and cryptographic hash/revision are verified during intent issue, commit, and account read; drafts, archived sessions, modified/replaced prescriptions and unavailable sources fail closed.
- Revoking the guest **invitation** after an already confirmed Account save does not automatically delete the independently authorized saved reference; **archiving or republishing** prevents opening that pinned version. Updated revisions require the recipient to explicitly re-save from a valid source invitation.
- \`app.saved_sessions\` is unique per source session and has account ownership RLS. Two Google Accounts cannot claim the same session; an existing verified Client-account binding to a different Google identity blocks save. Saved session ownership is not silently transferable.
- No private session selector, bearer token, health content or arbitrary URL enters OAuth. Private media are served via the app's authenticated GET/HEAD/Range proxy with per-request account/session/item checks, never a public Storage or Drive link.
- No clinical advice is generated; only the practitioner's approved published session is saved.

## Files

- SQL: \`sql/client-session-google-save-20261015.sql\` (additive).
- \`lib/app/client-session-save-flow.js\`: create intent, commit, read, remove.
- \`lib/app/save-intents.js\` / \`app/api/app/[...path]/route.js\`: browser-proof and OAuth handoff, owner APIs.
- \`components/save-client-session-to-account.jsx\`: explicit consent button on the authorized session.
- \`components/app/saved-sessions-panel.jsx\`: My Reports listing.
- \`app/[locale]/app/sessions/[id]/page.jsx\`: account-verified full HTML reader.
- \`app/api/app/saved-sessions/[id]/media/[assetId]/route.js\` and PDF route: full authorization on each request.
- \`tests/client-session-save-to-google.test.mjs\`, app Postgres integration tests.

## Release gates

1. Apply additive SQL to existing Holistic House Supabase only after isolated schema/RLS tests and inspect the new table privileges. Do not create a second Supabase project.
2. Merge only if app unit/integration/Next build/lint and OAuth continuation tests are green.
3. Private-session feature flag \`HH_CLIENT_DELIVERY_ENABLED\` is still OFF, and private server-only Supabase Storage credential \`HH_APP_SUPABASE_SECRET_KEY\` is missing; the merged UI remains dark until those existing release gates are addressed.
4. Test real iPhone Safari, Android Chrome and authorized session A/B, rejected account B, withdrawn/revisioned report, expired/rotated grant, HTML/PDF/audio/video on an actual private account. Test account deletion/data export and that no client data is leaked to Google provider.
5. Never claim a real client successfully saved a session until end-to-end verified with an explicitly approved synthetic/consented test user.
