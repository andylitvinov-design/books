# Holistic House · Personal Video Gift · release contract

## Scope and truthful feature levels (21 November 2026)
Canonical Studio route: /{ru|en|es}/holistic-support/mandala?mode=gift.
This is a mode in Video Studio, not a new independent video editor.

### P0 implementation included in this source change
- Six-step wizard for occasion, local photo+permissions, camera movement,
  editable greeting, first-party soundtrack / user-supplied voice,
  25s composition, 9:16 / 16:9, MP4 download and device Share.
- Timeline 0–3 intro, 3–8 photo, 8–19 editable text, 19–25 ending.
- Same local Canvas painter for preview/export, no paid requests.
- Free camera pan/zoom does NOT animate facial expressions. Blink, smiling,
  waving, head movement and voice synthesis are not presented as available.
- Existing H.264/AAC WebCodecs exporter where supported, with iPhone Safari
  native H.264/AAC MediaRecorder fallback through shared fast-start remux
  and video/audio/end-frame verifier. Never silently drop selected audio.
- Browser photo rescaling strips EXIF and remains on device; owner/third-party/
  minor permission attestations are mandatory, NOT independent proof.
- Only a finished MP4 can be uploaded to existing private My Videos with
  separate opt-in and authenticated session. No raw photo/text uploaded.
  HH_PERSONAL_VIDEO_CLOUD_SAVE_ENABLED remains the existing gate. Quotas
  12 MB per file, 3 videos per account, 180 MB total remain unchanged.
- Existing My Videos 25s duration check, API validation and DB constraint
  updated together; the migration must be applied before cloud-save E2E.
- Physical iPhone Safari, Chromium and signed-in E2E remain unverified until
  device testing and correct READY production SHA.

### P1 NOT enabled by this change
A dormant account-RLS ledger, app_private.video_gift_jobs, reserves fields
for idempotency, consent, 7-day TTL, provider task ID, private keys and budget.
No runtime API submits HeyGen. Do not create provider credentials or billable
jobs by guessing API semantics or pricing.

Future paid workflow is gated on ALL the following:
1. Authenticated, consented photo upload to an account-owned private key;
   separate depicted-person consent, guardian permissions for minors and
   explicit third-party AI processing notice.
2. Exact provider/model/5s quote, verified payment, per-job cost cap and
   remaining monthly budget BEFORE accepting the billable job.
3. Atomic transaction budget reservation and immutable per-user idempotency
   key; one provider POST only. Unknown timeout must be reconciled, not
   retried as another paid job.
4. Allowlisted provider calls, verified webhooks/poll status, no clinical
   reports, tests, original speech, client notes or unconsented photos.
5. Privately stored source/AI/output with short-lived signed reads and
   verified TTL erase jobs in both Supabase and provider. Metadata alone does
   not delete anything. Explicit erasure must be tested.
6. Compose the returned 5s clip in the SAME Studio timeline, edit text/music
   without a new paid call, fall back to free P0 on failure/no credits.

### P2 NOT enabled
Post-coaching/therapy gift workflow and Premium orders need separate
authenticated service and explicit customer approval. Never import medical
notes, voice, CRM contacts or therapy photographs automatically.

## Acceptance gates before claiming LIVE
- [ ] Focused Node tests, normal Core/Specialist/security/consent/WebKit CI.
- [ ] Apply the 25-second duration migration and test signed-in My Videos E2E.
- [ ] Physical iPhone Safari: HEIC/JPEG, 25s MP4 H.264+AAC audible in
      Files/Share, retries, interrupt, screen-lock, real download.
- [ ] Chromium: portrait and landscape, real MP4 and audio track decoding,
      data length/size, preview and exported frame equality.
- [ ] RU/EN/ES including long text at 320/390/430 px without overflow.
- [ ] Refuse third-party/minor consent omissions and other-account access.
- [ ] Erasure, private signed links, no public/ or GitHub customer media.
- [ ] P1 only: provider 401/402/429/500, zero credits, timeouts,
      double-click retries, budget exhaustion, verified fallback.
- [ ] Protected exact-HEAD PR merge, then existing hourly production
      publication with matching served canonical alias and release SHA.

No new paid provider, subscription, storage bucket, scheduled worker or
Vercel deployment is authorized by this P0 source change.
