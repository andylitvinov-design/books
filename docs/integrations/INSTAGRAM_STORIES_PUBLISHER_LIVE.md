# Holistic House · Instagram Stories Publisher — LIVE gate

## Existing architecture, no second publisher

Extend the existing Growth Studio / Social Publisher. Video Studio delivers a public
media URL and description to the existing editorial record and Meta adapter.

- Work destination: @wizards.secrets (wizards_secrets).
- Personal destination: @andy.therapist (andy_therapist).
- Each Story requires an approved source revision, account verification, protected
  feature flag and one explicit owner confirmation. No scheduled autoposting.

## External owner gates before claiming LIVE

1. Instagram **Business** profile linked to the owned Facebook Page; Stories
   publishing with this Facebook Login Meta Graph API is not available for
   Creator or personal profiles. Confirm exact Page ID, IG username and ID,
   Page creation permissions, instagram_basic and instagram_content_publish.
2. Set Vercel Production META_APP_ID, META_APP_SECRET, META_GRAPH_API_VERSION,
   META_REDIRECT_URI and META_TOKEN_ENCRYPTION_KEY privately. The existing
   encrypted Redis store also requires its protected credentials. Register
   the exact OAuth redirect URI in Meta. Never put secrets in source or chats.
3. Owner opens /admin/growth-studio → Connections → Connect with Meta for
   @wizards.secrets. The identity, Page and scoped permissions must verify.
4. Prepare a non-client public JPEG or MP4 hosted on the selected brand domain.
   Compose it as vertical 9:16 *before upload*, with the intended text and CTA
   already on the asset. Graph API does not render a Story caption, interactive
   sticker, music or clickable website link from the editor's text fields.
5. Once account authorization and Media preflight are ready, set the protected
   Vercel Production HH_GROWTH_INSTAGRAM_PUBLISH_ENABLED=true, then redeploy via
   existing protected pipeline. Leave it off/absent until then.
6. Publish exactly one approved test Story with owner confirmation; independently
   verify the Story in the exact Instagram profile and preserve Meta container
   ID, published media ID, media_product_type STORY, and provider timestamp.
   A Story permalink may not be returned and must never be invented.

## Processing, safety, idempotency

- Create IG media container with media_type=STORIES and image_url (JPEG) or
  video_url (MP4), then poll provider status before media_publish.
- If status is not FINISHED, keep saved provider_processing and allow a manual
  “Check Story processing and continue” for the same container. Never create
  a second container for an in-progress video.
- Any ambiguous post-publish result is delivery_unknown, not published. Do not
  automatically retry a container whose publish result is unknown.
- Existing Feed drafts default to Feed; no implicit migration to Story.
- No new queue, paid infrastructure, service, worker or secret store.

## Independent release evidence

A GitHub PR and Vercel READY deployment alone do not prove publication. Acceptance
requires protected Core/Specialist/merge-check, served production SHA, a real
authenticated provider readback, and a visible Story in @wizards.secrets.
Without the latter, report CODE READY / META AUTH REQUIRED, not LIVE.
