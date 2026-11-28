# Wave / Ali Gemini public access operator runbook

The owner attested Free Tier on 27 Nov 2026. The Vercel production public and billing-confirmed flags were enabled. Supabase aggregate audit found **zero** account attestations and **zero** currently eligible accounts. No one can use the automatic public Gemini path until a verified account is provisioned.

This tool is restricted to an authorized operator, with existing server secret loaded securely into the environment. It does not replace a customer consent screen or identity/age/region verification. Never set flags based solely on an app request, unknown eligibility, Google login, an IP guess or blanket owner approval. Check current Google terms and eligible regions, verify adult status and eligible region outside EEA/UK/CH, record the client's explicit informed consent to public-only Gemini processing (Google may use public inputs/outputs to improve products), and confirm the exact verified account UUID from authorized records. Do not store personal verification evidence in source or logs.

Use the existing securely loaded HH_APP_SUPABASE_URL and HH_APP_SUPABASE_SECRET_KEY; never paste secrets into chat or commands. Dry run first:

    node scripts/wave-gemini-public-access.mjs grant ACCOUNT_UUID --adult-verified --region-verified --public-consent-verified

Apply only for a reviewed account by appending --apply. Check with:

    node scripts/wave-gemini-public-access.mjs status ACCOUNT_UUID

Revoke immediately when consent or eligibility changes:

    node scripts/wave-gemini-public-access.mjs revoke ACCOUNT_UUID --apply

Grant expires in 30 days; reverify before renewal. No bulk operation, no paid provider fallback. This is operator access tooling, not a customer-facing onboarding implementation. Serialize administrative changes to the same account. No user metadata authorization, no database migration. Run unit tests with node --test tests/wave-gemini-public-access.test.mjs.

After the protected production release, sign in to the verified account, GET /api/holistic-agent/turn (must show ready_for_public_turn), then send an ordinary public question such as "What is coaching?" and verify source=gemini-free-public and modelUsed=true, followed by "Give an example" and corresponding RU/ES questions. Do not test private or medical data via Google. Check account without attestation, expired/revoked access, rate limit and local fallback. Verify canonical READY commit and actual iHelp path. Never infer model use from ready status. Existing PR #5834 implements public follow-ups. No user or operator credentials should be printed. Full private inference is a separate compliant provider path, not unpaid Gemini. Related #5553 and #4797.
