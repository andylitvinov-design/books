# Holistic House: private audio per client consultation

Status 2026-10-15: PR #592; schema and private bucket provisioned in existing Canadian Holistic House Supabase project. Feature remains disabled on production.

## User experience
- Owner can create/open a dedicated consultation session in client admin, or record voice from existing consultation/report editor.
- On iPhone, use microphone, pause/resume, finish. File uploads privately and attaches automatically to that consultation.
- Two scopes: client message vs private practitioner note. Private notes excluded from client payload and playback.
- Add a personal title, explanation, report PDF, multiple audio/video items, manually editable transcript, reordering. Explicit Publish required; draft saved does not notify client.
- Share exactly one consultation using fragment bearer secret, exchanged into scoped HttpOnly Secure cookie; separate from full cabinet. Rotate, revoke, extend and archive.
- Client has private player (5min signed playback URL), original PDF, optional transcript, without YouTube/Drive public links.

## Infrastructure
- Existing repo and Vercel project used; do not deploy the PR without verification.
- Migration file: sql/client-delivery-sessions-20261015.sql. It was applied to production Supabase 2026-10-15.
- Four app_private RLS tables restricted to hh_app_backend. Encrypted draft and published snapshots use HH_APP_ENCRYPTION_KEY with per-record AAD.
- Private Supabase bucket hh-client-private-media (public=false), allowlisted MIME types and 50MB bucket cap (Supabase Free global maximum). No public Storage SELECT policies. Audio max 20 MB, MP4 max 45 MB to remain under the existing Free-tier 50 MB global upload ceiling.
- Browser upload uses temporary signed upload token, not a large Vercel file POST. Backend validates object type/size, and playback is authorized separately.
- Feature flag HH_CLIENT_DELIVERY_ENABLED is OFF by default.

## Release blocker and runbook
1. Configure HH_APP_SUPABASE_SECRET_KEY in Vercel production secrets through the secure admin interface, never in GitHub/ChatGPT/client code. Current Vercel project has no such environment variable.
2. Verify existing HH_APP_ENABLED, HH_APP_PRODUCTION_APPROVED and encryption/database config; do not expose secrets as NEXT_PUBLIC_*.
3. Run preview tests using equivalent **private** Storage configuration; verify RLS, cross-client access, notes filtered, link expiration/rotation/revocation, report PDF starts with %PDF, and Safari iPhone microphone interruptions/retries.
4. Review consent and privacy handling of sensitive session content and any required processor agreements. Do not enable third-party speech recognition by default.
5. Only after tests and approval merge and enable HH_CLIENT_DELIVERY_ENABLED in production. To roll back, unset this feature flag. Schema remains safely dormant.

## Known follow-ups
- Automatic AI transcription is NOT connected. Transcript text can be entered/edited manually, pending secure processing approval.
- Detaching media from draft removes it from published view after republish, but does not yet physically delete the Storage object. Add retention garbage collection after testing.
- This version links the legacy consultation/recommendation PDF model; separately generated psychometric test report records need independent binding and tests.
- iPhone hardware acceptance and live media end-to-end playback remain unverified until server key and preview test environment are configured.

Primary route paths: /admin/clients/[id], /admin/clients/[id]/sessions/[sessionId], /admin/documents/[id], /admin/consultations/[id]/edit, /en/client/session/[selector], /en/client/[selector]/sessions/[sessionId].

### Free-tier media cap correction (2026-10-15)
The connected Supabase organization uses Free (single-file maximum **50 MB**; egress limit **10 GB** split between cached/uncached bandwidth). Limit private video uploads to **45 MB** and audio to **20 MB**. The first production bucket was mistakenly configured to 100 MiB; reduce its storage.bucket file_size_limit to 50,000,000 bytes without changing visibility or objects. Larger original 1080p MP4 masters remain in approved restricted archives; private cabinet gets a compressed playback copy. No plan upgrade authorized. 5-minute signed URLs are renewed during longer audio/video playback without exposing other consultations.


## Recorder hardening and release gates

- Saved consultation, recommendation and practitioner assessment editors open a
  recorder pinned to that saved source and client. An assessment's result/private
  comment is not copied into a session; existing assessment/report/PDF permissions
  remain separate. Save a new source before recording to it.
- Audio and MP4 video capture support pause/resume/finish. Unsupported MP4 capture
  offers existing-file upload. Physical iPhone Safari acceptance is still required;
  cloud WebKit with mocked MediaRecorder proves UI state only.
- Retry retains the in-memory file, client/session, privacy scope and stable intent
  UUID. A lost intent/finalization response does not intentionally create another
  asset. Keep the page open until upload succeeds; mobile OS termination cannot be
  recovered from memory. Interrupted recordings are not automatically published.
- New upload intents pin exact byte size in max_bytes. Old pending intents created
  with a MIME ceiling must be discarded/recreated; do not relax exact validation.
  Ready assets are unaffected. Header sniffing and byte counts do not constitute a
  full codec/decode or malware scan; actual playback acceptance remains required.
- Explicit cleanup claims only never-ready pending/failed tombstones older than
  24 hours, then removes Storage objects and successful tombstones. Never select
  ready assets for cleanup, including detached media from older publications.
- Client media uses an authenticated, same-origin streaming GET/HEAD with single
  byte Range support. Each new request rechecks grant expiry/revocation and the
  published client/session/scope association. No client Storage bearer URL is
  returned. Already authorized in-flight transfers or downloaded/buffered bytes
  cannot be revoked. Owner preview still uses owner-authorized short signed URLs.
- PDF and HTML rendering use the exact fingerprint-verified published source,
  never a fresh unchecked second document read.
- Transcription remains manual (12,000 characters); no external transcription
  processor or consent flow has been enabled.
- Before release: exact-commit CI/build/CSP checks, isolated SQL concurrency tests,
  secure server key configuration, synthetic signed upload/finalize/playback,
  proxy Range 200/206/416 including >4.5MB synthetic video on Vercel, grant
  expiry/revocation/cross-client checks, and physical iPhone capture acceptance.
  Keep HH_CLIENT_DELIVERY_ENABLED OFF until approved acceptance is complete.
