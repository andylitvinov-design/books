# Holistic House — Personal Video Gift · release and safety
Date: 21 November 2026. Scope: existing Video Studio only; no second editor.
Canonical route: /{locale}/holistic-support/mandala?mode=gift.
Existing /{locale}/video-studio?mode=gift redirects to the same page.

## P0 implementation
- Six-screen EN/RU/ES gift flow: occasion and recipient; private photo/rights/permissions; free camera motion and color; editable message and ending; existing first-party soundtrack or user-owned recorded voice; preview and MP4 export.
- Four beats: 0–3 intro, 3–8 photo, 8–19 editable greeting, 19–25 final wish and sound fade. Portrait 9:16 default, landscape 16:9 selectable.
- Uses shared Canvas and WebCodecs H.264/AAC MP4 exporter. On iPhone when possible, uses native MediaRecorder MP4 with strict H.264/AAC track inspection and fast-start normalization. No browser or cloud fallback is falsely labelled MP4.
- Free photo motion is camera pan/zoom/float, NOT a facial expression or hand animation. Smile, blink, head turn and wave are separately gated HeyGen options.
- Free photo and optional user-recorded voice stay on device; no upload to public folders. Require image rights; consent from depicted third persons, plus guardian consent for minors; sound recording rights required.
- Existing private My Videos signed upload/save/download/delete reused. Add 25 seconds and gift theme in both server logic and database CHECK constraints; require an additional unchecked cloud-save consent. Existing storage and per-user quotas remain. Cloud is optional; local download works without login.

## P1 paid adapter — OFF until verified
- Server-only adapter implements HeyGen Video 1 image-to-video 5s / 480p via official v3/models/videos create/status endpoints, Idempotency-Key and fixed safe motion prompts without speech or lip syncing.
- Add private owner-scoped video_gift_jobs table and RLS. Owner inserts restricted to inert free drafts; no anonymous/client authority to post a paid provider job.
- Required before enabled production flow: authenticated private JPEG upload; server-to-server consented HeyGen asset import; verified existing payment receipt for gift SKU; atomic per-user/per-job/monthly budget reservation; single worker claim and unknown-outcome reconciliation; signed provider callback and fallback status read; private verified 5s MP4 ingest; genuine 3–8s timeline splice; provider/storage deletion and retention expiration.
- All nonzero paid requests must remain disabled until an independent receipt audit and explicit spending approval. No new subscription, worker, timer or server FFmpeg is authorized.
- Require server-only settings for provider key, verified payment gate, current verified 5s quote, per-job cap and monthly cap. Settings alone cannot substitute for proof, worker or client consent.
- Provider asset requests, model outputs and real prices cannot be assumed from the existence of a connected HeyGen account. No money spent by this PR.

## P2 future extensions
- Optional coached/therapy session gifting with new explicit consent; Premium themes and orders only after existing checkout and receipts are independently verified. Do not send therapy history or health data to HeyGen.

## Verification checklist before claiming LIVE
1. Run focused Node tests video-gift-personal.test.mjs and video-gift-heygen-adapter.test.mjs.
2. Pass all applicable protected Core, Specialist, hh-merge-check on exact source SHA. No bypass or no-op CI reruns.
3. On a REAL iPhone Safari and Chromium: view and generate portrait + landscape MP4, decode H.264 + AAC, verify audible soundtrack and voice, inspect Cyrillic/English/Spanish text, test abort/retry/download/share, and confirm preview matches final frames.
4. Test a signed-in My Videos save/reload/download/delete, owner isolation, quota limits and no public photo leak. Verify private cloud-save flag in the actual target environment.
5. Mocked paid API tests do not prove production HeyGen authorization, quota, charges, credits, webhook or MP4 ingest.
6. Protected merge -> existing hourly Vercel production publisher -> independently verify served canonical domain and correct production SHA. Never add an emergency redeploy without separate owner approval.

## Lifecycle
Job rows have a 14-day expiry; future paid source JPEG/5s fragment retention and provider deletion require an existing trusted cleanup worker and documented policy before activation. Existing My Videos finished masters retain their established explicit owner-delete rights; do not silently expire older user videos without prior consent.


## Gift emotional message quiz · owner-approved 21 Nov 2026
- Separate Gift taxonomy, not a replacement for MyTube For Me / For Work goals:
  1. Miss You → Thinking of You / Sending You a Hug / You're Amazing / You're in My Heart
  2. Thank You → For My Family / For Your Support / From the Heart / You Mean So Much
  3. Support & Motivation → You're Not Alone / This Too Shall Pass / Better Days Ahead / I Believe in You
  4. Congratulations → Happy Birthday / Happy Holidays / I'm Proud of You / You Deserve It
- Gift entry (once this PR passes protected checks and merges): `/{en,ru,es}/holistic-support/mandala?mode=gift`.
- First existing step becomes an inline four-stage quiz: emotional category → one of four messages → emotional style (Gentle / Warm / Joyful / Inspiring) → recipient name. Each selection automatically advances one question. Back returns through the same stages; Next uses the selected deterministic default and never calls AI.
- The 16 local, distinct EN/RU/ES scripts are fully editable on the Message screen. Style presets update existing motion, palette, soundtrack and licensed local footage-group preference; photo rights, subject/guardian consent, signed video storage and Safari MP4 verification remain untouched.
- Legacy `occasion` survives only as a backend/media compatibility mapping; validated manifest also carries giftCategoryId, giftMessageId, giftStyleId. No new schema, paid API, credit write, photo transfer or automatic HeyGen render is authorized by the quiz.
- Keep PR #5334 out of production until its overlapping Gift writer/DB contracts are reconciled and one canonical Gift implementation is chosen; do not merge both. `For Me`/`For Work` 4×4×4 and in-flight PR #5341 must not be rewritten as Gift taxonomy.
- After protected merge + existing hourly production release, independently verify the canonical alias SHA and guest EN/RU/ES @320/390/430 card→message→style→recipient→photo/consent→message→audio→valid MP4. Paid HeyGen, one-free-living-photo and 500 XP charges require separate cost, consent and real-provider acceptance, not simulated here.
