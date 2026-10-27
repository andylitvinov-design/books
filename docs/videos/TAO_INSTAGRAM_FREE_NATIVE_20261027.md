# Dao Wisdom / @tao.ideas — free Instagram native Reel handoff

2026-10-27 · Owner-only preview feature · zero new paid subscriptions, API calls or publisher accounts.

This is a **native assisted publishing** path, NOT an automatic Instagram connection. It reuses the existing protected Holistic House video admin screen, one Instagram account (@tao.ideas), Kling scene studio and existing Telegram/CRM. No Metricool, Meta App or Instagram OAuth is necessary for this assisted handoff.

## Actual sequence

1. Create/assemble a finished public 9:16 Reel (recommended 1080×1920, 15–35s, narration, readable subtitles, original/approved visuals). The existing Kling Scene Studio produces **silent 5–10-second B-roll**, so it is NOT by itself a narrated full Reel. Do not start paid Kling generation without separate consent and cost estimate.
2. Save the finished MP4/MOV on the iPhone. Open https://holistichouse.vercel.app/admin/videos#instagram-native-reel-kit after owner authentication. Pick a video file; the local browser reads metadata, previews it and checks format and duration. No upload to the Holistic House backend or cloud occurs in this step.
3. Review the author-attributed caption in RU/EN/ES, copy it and confirm rights/no client material. Tap **Share MP4**. If Safari offers Instagram among system share destinations, select it and continue in the Instagram app; otherwise download/save to Photos and create a Reel using Instagram + → Reel. Ensure the signed-in destination is **@tao.ideas**, choose cover and explicitly Publish inside Instagram. File sharing never means published.
4. For the Instagram bio, copy the public Dao landing link from the kit. Current link opens the existing RU Dao health profile page with non-identifying organic campaign code. Deep Telegram source/CRM connection still has independent E2E gates (books #2257, PR #2259); no claims of new verified leads until proven.
5. After a real public Reel is published, independently inspect the Instagram account and real permalink, record its ID/URL and date in existing Growth Studio/issue #2257. Entering a syntactically valid permalink into this kit does NOT authenticate the author or make a post.

## Security and QA

The file stays on the current device until an explicit user click invokes a native OS share destination. Local URL.createObjectURL is revoked when input changes or the owner leaves. Strict MP4/MOV 1 GB max, 9:16 orientation, 3–900s, checked metadata, owner rights confirmation, edit/copy caption with 2200-character guard. Small iPhone 320–430px layouts, keyboard labels and clear not-published statuses. No client photos, diagnosis content or health data. No access tokens, user/password scraping, Meta pixel, provider API calls, paid credits, new database or redirect/callback setup. No automatic publishing or scheduling.

## Fully automatic direct Instagram alternative (separate authorization)

Meta supports Instagram API with Instagram Login for Business/Creator profiles without requiring a Facebook Page. To use it, the owner must configure an official developer app and grant scoped OAuth permissions instagram_business_basic and instagram_business_content_publish. Implement media-container processing, idempotent publishing and provider permalink readback only after App ID and owner-approved credentials are verified and reviewed. Standard Access may suffice for an app owner's own account, but third-party use can require Meta review/verification. None of this authorization is currently available, so the native kit is deliberately independent and does not claim unattended posting.

Sources:
- https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share
- https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api
- https://github.com/andylitvinov-design/books/issues/2257
- https://github.com/andylitvinov-design/ai-projects-brain/issues/219

## Acceptance not yet completed

Tests/source static checks may pass before merging, but full lint/typecheck/build, owner signed-in iPhone 320–430px native share dialog, Safari → Instagram app handoff, actual Reel publish/permalink, Vercel READY/SHA and actual bot-to-CRM receipt require their own independent proof. Do not mark Instagram connected or the E2E done merely because this page exists.
