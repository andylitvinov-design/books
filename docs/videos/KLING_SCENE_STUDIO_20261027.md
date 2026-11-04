# Kling AI scene studio — Holistic House (2026-10-27)

## Intent and scope
Kling is an **optional hosted video-scene provider**, not a replacement for the
verified, private **Andrey Litvinov HeyGen Digital Twin**. Only public,
non-client atmospheric B-roll, abstract scenes, or already-approved public
site images are eligible. Do not upload private client media, health records,
personalized report contents, or unapproved likenesses.

Owner entry: `/admin/videos#kling-scene-studio`; this **reuses** the existing
admin videos screen and the existing verified admin session, not a new admin
authentication or publication system. EN/RU/ES user interface, warm mobile UI.

## What is implemented
- Compose an EN-friendly scene prompt from three starter examples or custom text;
  copy it to https://kling.ai/ for web/manual use **without API charge here**.
- Choose text-to-video or image-to-video from an already-public
  `https://holistichouse.vercel.app/images/...` JPG/PNG URL.
  Kling 3.0 does not accept WebP first-frame input; approved WebP assets must
  be converted to JPG/PNG offline and published before they can be used.
  Strict URL allowlist and a separate rights/public-asset confirmation are
  enforced **on the server**; no private signed URLs or arbitrary remote hosts.
- Lowest-cost image route: official **Kling 2.5 Turbo Standard 720p**, 5s
  via `/image-to-video/kling-2.5-turbo` (published API reference rate
  1.5 resource units/5s; owner account price not yet verified). It uses
  approved public JPG/PNG only and inherits the image's aspect ratio.
- Text-only route: Kling 3.0 Text-to-Video defaults to **3s, silent, 720p**;
  formats 16:9/9:16/1:1. Both are blocked by default until the separate
  `HH_KLING_PAID_GENERATION_ENABLED=true` authorization. 5/10s or 1080p
  additionally require `HH_KLING_PREMIUM_RENDER_ENABLED=true` and separate
  owner-approved cost. No audio generation or third-party voice.
  Commercial free-web draft rights must be verified before public reuse.
- Check a task by returned ID or external ID manually; result links are temporary.
  No unattended polling, automatic retries, download, import, publishing or
  external charge on page load.
- Authorizing a paid render requires **both** a server-only feature flag and
  an explicit owner checkbox for that render. Unhandled provider errors do not
  leak credentials or raw output.
- The UI is safe and useful as a no-charge **draft-only mode** by default.

## Account setup (owner-only external authentication; no secrets in chat/git)
1. Sign in at https://kling.ai/dev and create an official API key at
   https://kling.ai/dev/api-key . Pricing/trial package:
   https://kling.ai/dev/pricing?scrollTo=video .
2. In Vercel project `super10/codex-public-book-library`, **Production**
   environment, add `KLING_API_KEY` as a sensitive/secret variable, value
   entered **directly into Vercel**. Never paste it in a chat, PR or log.
3. Default `HH_KLING_PAID_GENERATION_ENABLED` to absent/false.
   **Only after approving the paid resource/package and budget**, set
   `HH_KLING_PAID_GENERATION_ENABLED=true` and redeploy Production
   from the verified branch. Without it no video can be paid-rendered.
   No cost ceiling or provider billing quota is promised by this flag:
   check the provider's actual cost controls **before enabling**.

## Operational workflow
1. Draft an atmospheric public scene in the existing video admin.
2. For free/manual usage, Copy Prompt → Kling web editor. The web account's
   terms, credits and watermark rules apply separately; browser-generated
   files do not magically appear in the Holistic House library.
3. For API generation (after explicit paid activation) confirm the checkbox.
   A generated external ID is shown even if the provider times out; **look up
   that ID before retrying** to avoid duplicate paid jobs.
4. Query status manually and QA the returned video: scene, movement, defects,
   no unintended faces, correct dimensions/audio, licensing and safe claims.
5. Download provider MP4 **before its retention period expires** (Kling's
   docs mention 30 days), archive to canonical Google Drive master with the
   #219 naming rule, then use the **existing** YouTube/Metricool/site-video
   publication tools only after a *separate* approval. Public website delivery
   remains poster-first and YouTube/Unlisted when appropriate.
6. No Kling-generated client/private video is allowed. No generated likeness
   substitutes for Andrey's verified Digital Twin.

## Testing and limitations
Contract tests mock provider create/status and verify authorization boundaries,
input validation, safe URLs, no audio, no duplicate automatic submissions.
No paid live render or provider identity test without owner API key/credits.
No proof of automatic Drive archive, YouTube upload, lip-sync or real media QA.
Generation task IDs remain provider-managed; there is no new database ledger.
Keep the ID for recovery; add durable job ledger only after confirming existing
provider records/retention and avoiding duplicate schema.

Official references:
- https://kling.ai/document-api/guides/get-started/quick-start
- https://kling.ai/document-api/apiReference/model/textToVideo
- https://kling.ai/document-api/apiReference/model/imageToVideo
- https://github.com/andylitvinov-design/ai-projects-brain/issues/219
- https://github.com/andylitvinov-design/ai-projects-brain/issues/218

## Owner wealth-flow video recipe — no automatic payment

Purpose: a symbolic self-reflection film using the already public Holistic House
owner portrait at /images/holistic-house/andy-about.png. The fourth scene
preset in the EXISTING /admin/videos#kling-scene-studio fills that source
and a face-preserving visual prompt. Selecting it creates NO Kling job,
does NOT accept a third-party image, and leaves media-rights and paid consent unchecked.

Final length 15–20 seconds, one OPTIONAL paid generation of 5 seconds:

| Segment | Visual direction | Cost |
| --- | --- | --- |
| 0–3s | Real owner photo, warm beige-and-gold background, free slow zoom | Local FFmpeg, zero API credits |
| 3–8s | Symbolic coins, abstract money-like paper and gold light flow TOWARD the person's open hands, not across the face | ONE optional 5s 720p Kling 2.5 Turbo Image-to-Video job, ONLY after personal provider cost/rights approval |
| 8–15s | Animate free particle layers, hold/loop last approved frame | Local FFmpeg, zero API credits |
| 15–20s | Soft glow around figure, original voice and subtitle if desired, calm fade | Local FFmpeg, zero API credits |

Sample RU voice: «Деньги приходят ко мне. Я замечаю возможности и принимаю достойную оплату за свой труд».
EN: I welcome opportunities and fair payment for the value I create.
ES: Recibo oportunidades y una remuneración justa por el valor que creo.
An affirmation is a symbolic meditation, not an income guarantee or evidence of earnings.

Cost-free alternative: build the whole MP4 by looping/animating the real portrait
and freely generated SVG coins, particle layers, light ribbons and original voice
with existing FFmpeg; no Kling job required. Maintain 9:16 Reel and 16:9 website
compositions from one master rather than rendering separate paid Kling models.
Before Kling receives the public portrait, the owner explicitly confirms the
image is theirs and suitable for a third-party provider. Never send photos
from protected client records. Provider task result must be reviewed before any
independent Drive master, YouTube or website publication.

## 2026-10-27 iPhone flow after owner screenshots — no API credits

- On iPhone, the Kling scene studio has a compact layout: four mutually
  exclusive scene buttons, visible `aria-pressed` selection, direct public
  owner portrait thumbnail (original aspect ratio, `height:auto`), and
  free actions **before** hidden advanced settings/task lookup.
- Owner wealth scene can be deep-linked at
  `/admin/videos?klingScene=wealth#kling-scene-studio`. Query selection
  presets `image`, approved public `andy-about.png`, Kling 2.5 Turbo STD,
  5 seconds, 720p. It does **not** mark media rights or paid consent checked.
- **New local no-credit option:** `Create free 12s video` creates a silent
  9:16 short in the owner's browser from the existing public portrait and
  synthetic geometric golden coins. It preserves the full photo aspect ratio,
  keeps the face unobscured, draws an affirmation (EN/RU/ES), and uses the
  browser's `canvas.captureStream` / `MediaRecorder` with MP4 preferred and
  WebM fallback, then shows a local preview and explicit download link.
  The feature is lazy-loaded on click. It does **not** POST photos or video,
  call Kling, spend credits, use a voice clone, archive masters, or publish.
  The temporary `blob:` URL is revoked when replaced or the owner leaves.
- In-app browser capability varies. If capture/MP4 is unsupported or a
  recorder fails, the user sees an explicit message and retains the
  no-charge **Save portrait + Copy prompt + Open Kling Web** workflow.
  Do not call client recorder support a verified on-device iPhone E2E
  until tested on actual 320–430px phone/browser.
- The cost gate remains OFF in Vercel. **Do not** enable
  `HH_KLING_PAID_GENERATION_ENABLED`, avatar or premium flags,
  create a paid render, or auto-publish as a workaround to a disabled button.
  Browser-rendered or free-web imagery must be QA-reviewed and checked
  for publication rights before use in ads.
- Local output is a symbolic self-reflection video, **not** a statement of
  real income, guaranteed prosperity, or any financial result. To add a voice,
  reuse the owner's own recording and existing Telegram photo/audio FFmpeg
  editor, rather than paying for AI speech or creating a new publisher.
