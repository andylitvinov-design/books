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
- Render via official Kling 3.0 Text-to-Video / Image-to-Video API (once configured).
  5 or 10 seconds, 720p draft or 1080p final, 16:9/9:16/1:1 for text mode.
  Image mode inherits reference frame ratio from the image.
  Audio is always OFF to avoid misrepresenting Andrey's voice.
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
