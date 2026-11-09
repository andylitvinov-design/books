# Meta OAuth setup — Growth Studio

Date: 2026-11-09

This implementation uses **Instagram Graph API with Facebook Login** because the commissioning requirement explicitly needs the linked Facebook Page and its Page ID. This is distinct from Instagram Login, which uses the Instagram-specific permission family and does not supply the same Page-link workflow.

## Owner-approved Instagram destinations

| Internal target | Role | Handle | Editorial profile |
|---|---|---|---|
| `wizards_secrets` | Work | `@wizards.secrets` | Wizards Secrets · Holistic House |
| `andy_therapist` | Personal | `@andy.therapist` | Andy Therapist |

Each destination has separate Meta OAuth state, encrypted credentials, Instagram/Page IDs, publish approval and performance history. Former targets are no longer active.


## Meta app configuration

1. Use/create a Meta Business app in the Meta for Developers account controlled by the business owner.
2. Add Facebook Login and Instagram Graph API products.
3. Configure the OAuth redirect URI to exactly:
   `https://holistichouse.vercel.app/api/admin/growth-studio/meta/callback`
4. Set the Meta App Domains and HTTPS Privacy Policy / Data Deletion URLs in the app settings.
5. Start in Development mode with the owner added as an app role. Request Advanced Access/App Review and Business Verification only when onboarding people who are not app-role users requires it.
6. Link each target Instagram Professional account (Business or Creator) to its corresponding Facebook Page. The Facebook user authorizing the app must have a Page task that permits content creation.

## Vercel Production environment variables

Set these as server-only secrets, then deploy:

- `META_APP_ID` — Meta app ID.
- `META_APP_SECRET` — Meta app secret. Never expose to client code.
- `META_REDIRECT_URI` — exact HTTPS callback URL registered above.
- `META_GRAPH_API_VERSION` — pinned to `v27.0` in Vercel Production (confirmed current Meta API version on 2026-11-09). Update deliberately when Meta releases a newer supported version.
- `META_TOKEN_ENCRYPTION_KEY` — high-entropy secret (at least 32 random bytes). Used to derive the AES-256-GCM encryption key and OAuth state-signing key. Rotating it requires a planned credential re-encryption/reconnect.
- Existing `PRESCRIPTIONS_KV_REST_API_URL` and `PRESCRIPTIONS_KV_REST_API_TOKEN` — existing Redis REST connection; no new storage service.

## Owner commissioning

1. Sign in to the owner-only Growth Studio.
2. Click Connect beside one target account. Complete Facebook login and grant the requested scopes.
3. Callback reads granted permissions, managed Pages and linked professional Instagram account metadata.
4. The callback matches the exact expected username, requires a Page content-creation task, and stores encrypted credentials in the existing Redis service. It rejects missing/ambiguous matches.
5. Repeat separately for the work profile `@wizards.secrets` and the personal profile `@andy.therapist`.
6. Check status at `/api/admin/growth-studio/meta/status`. Only non-secret metadata is returned.

Requested scopes:
- `pages_show_list`
- `pages_read_engagement`
- `instagram_basic`
- `instagram_content_publish`
- `instagram_manage_insights`

Comments and messaging scopes are deliberately excluded.

## Security and current boundaries

- OAuth state is random, signed, short-lived, HttpOnly and SameSite=Lax.
- The callback requires the existing owner session and clears the one-time state cookie.
- Tokens are encrypted with AES-256-GCM before entering Redis; Redis keys are isolated per target and expire after 60 days.
- No token, app secret, authorization code or full provider payload is returned to the browser or logged.
- Disconnect deletes the corresponding credential record.
- The existing Growth Studio now includes a server-only, owner-confirmed Instagram JPEG Feed publisher with account identity checks and provider receipt/permalink readback. It is not an unattended scheduler.
- `HH_GROWTH_INSTAGRAM_PUBLISH_ENABLED` defaults OFF; keep it unset/false until the owner has completed Meta consent for each target and verified the returned identity, Page, scopes and posting task.
- A publish action requires an exact owner confirmation for the saved approved post, an exact account match, a public JPEG preflight and provider readback. An ambiguous result becomes `delivery_unknown`; the UI must not retry automatically.
- The dry-run scheduler remains simulation-only. No unattended posting, no automatic repeat, and no ad campaign is enabled.

## Meta UI access prerequisite

The app owner must finish the Meta dashboard setup and enter the server-only values above. An engineer cannot complete the business owner's Meta consent, prove account ownership, or obtain a Page ID without that interactive login and authorization.
