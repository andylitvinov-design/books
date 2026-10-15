# Private client video storage — Holistic House
**Status:** optional, **OFF by default**. Extend existing session-only media, do not publish client recordings to YouTube/Metricool or public R2 URLs.

## Existing system
Canonical `codex/public-book-library`: PR #592 private audio/video/session per-client drafts; PR #601 HTML report; PR #605 Google consented save; PR #610 private photos. This feature extends the existing upload/finalize/streaming endpoints and `app_private.client_delivery_assets`, with a backward-compatible `storage_provider` column. No duplicate video master or unrelated client-session access.

## Privacy before provisioning
- **R2** has 10 GB-month Standard free storage but offers no guarantee of Canadian data location; its `enam` hint does **not** imply Canada. Assess applicability of PHIPA/PIPEDA, informed consent, foreign data processing, contract/DPA, retention and incident response before using personal client recordings.
- **S3 Canada (Central)** (`s3_ca`) uses the fixed `ca-central-1` endpoint for a Canada-region storage preference, but still requires a privacy/processor review, encryption, IAM and billing controls. Do not automatically create buckets/accounts or incur spending.
- Buckets must be **private**: no public custom domains, no public `r2.dev` URL, block all public access for S3; use least-privilege bucket-scoped server credentials, HTTPS and provider-side encryption.
- No names/email/diagnosis in object paths, URL parameters or logs. Object keys are random UUID/UUID.mp4.
- This feature is *not* a client publication permission. Practitioner must explicitly publish the consultation; existing scoped guest, full cabinet and Google saved-report authorization checks remain on every player request.

## Configuration (Vercel private server environment)
Only after review, add all variables with the provider's protected-secrets interface:
- `HH_CLIENT_DELIVERY_ENABLED=true` (existing private session delivery security gate; requires prior private Supabase key + mobile/guest QA)
- `HH_APP_SUPABASE_SECRET_KEY` existing required private Supabase credential (not in source, never `NEXT_PUBLIC_`)
- `HH_CLIENT_VIDEO_EXTERNAL_ENABLED=true` only after integration QA
- `HH_CLIENT_VIDEO_BACKEND=r2` **or** `s3_ca`
- `HH_CLIENT_VIDEO_BUCKET` — dedicated private bucket, same for one provider
- `HH_CLIENT_VIDEO_ACCESS_KEY_ID` and `HH_CLIENT_VIDEO_SECRET_ACCESS_KEY` — server-only bucket-scoped credentials
- `HH_CLIENT_R2_ACCOUNT_ID` — 32-char Cloudflare account ID, **R2 only**

External videos cap at 200,000,000 bytes of MP4 `video/mp4` while old Supabase MP4 remains capped at 45,000,000. PDFs/photos/audio stay in private Supabase Storage and need no conversion. **MOV/HEVC is not transcoded**: use H.264/AAC MP4 when producing phone video; only a privacy-approved transcoding service can add auto-conversion. The browser uploads directly to the object-store signed PUT URL (15-min expiry) with Content-Type signed and bucket CORS limited to the Holistic House admin origin and PUT/Content-Type. Example R2 CORS:
```json
[{"AllowedOrigins":["https://holistichouse.vercel.app"],"AllowedMethods":["PUT"],"AllowedHeaders":["Content-Type"],"ExposeHeaders":["ETag"],"MaxAgeSeconds":900}]
```
No `https://*`, public READ policy or app-secret exposure. Preflight OPTIONS must succeed. The 15-minute presigned PUT is bound to a UUID path, type, scope/session in the database and a short TTL; multipart/resumable uploads after a browser reload remain future work, not falsely advertised.

## Operational rollout
1. Review/apply additive `sql/client-session-external-video-20261015.sql` and verify `app_private.client_delivery_assets.storage_provider` values default `supabase`, RLS `hh_app_backend` unchanged. This is a no-op for old files.
2. Prepare *private* R2/S3 bucket and narrow service credentials only after privacy/location decision. Disable public links, enable encryption/access logging, budget alerts, and restrict CORS.
3. Add server secrets above to **preview only**; keep production `HH_CLIENT_VIDEO_EXTERNAL_ENABLED` false. Upload a short **synthetic** 5–15 sec H.264 MP4 from iPhone/Android into a single test session; HEAD validates exact byte length/type; Range sniffs ftyp; inspect playback video/audio codec.
4. Verify draft-only, publish, multiple sessions, full cabinet, Google account, guest bearer, 200/206/416 Range, iPhone seeking/playback, expired/rotated/revoked grants, cross-client/cross-account isolation and practitioner-only scope. Verify owner preview and no public leak.
5. Confirm Vercel CI, Node build, authenticated production deploy/alias and real mobile QA. Set production flag only after recorded consent/security acceptance and approved vendor/routing. Rollback: unset `HH_CLIENT_VIDEO_EXTERNAL_ENABLED`; this safely disables access to external videos while leaving Supabase-based media unchanged.

## Limitations and cleanup
Existing Supabase media stays readable. External media requires the selected backend and credentials to remain configured; changing providers requires an explicitly planned migration and dual-read support. Signed PUT is a temporary bearer (not identity-proof); limit permissions, object size budget and concurrent pending intents. Upload retry can replay the same intent while the page is open; **large-file multipart resume across page reload is not implemented**. Recording termination during iOS suspension may lose unsaved bytes; prefer capture in native camera and choose from Photos. Only `pending` assets older than 24h are eligible for automated cleanup; once-published/ready videos require a reviewed retention and deletion policy. Detached assets can remain for earlier published revisions. Do not run retention cleanup without approval.
