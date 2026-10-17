# Holistic House — practitioner & service video presentations

- Master profile: one video presentation (YouTube/Vimeo link or uploaded MP4/MOV).
- Every service: its own optional video, independently from profile video.
- My Practice → My data or Services → edit → Video presentation → Link / Upload → Save → Submit for review. Initial onboarding accepts a link.
- Existing moderation remains authoritative: a changed draft doesn't replace an approved public video until an administrator approves the profile or service.
- Uploaded clips are promotional/public only, never client-private. A separate public Supabase Storage bucket `hh-practitioner-presentations` holds them, and private `app_private.practitioner_presentation_uploads` associates upload token, owner and ready state.
- Limit 25 MB each; MP4 preferred for browser compatibility, MOV supported from iPhone without transcoding (HEVC might not play on older browsers). Limit 24 completed files per practitioner; use unlisted YouTube/Vimeo for larger presentations. Pending uploads limited to 3 per two hours.
- Client uploads go directly to signed storage, never through the Vercel function body, never into Git. Server verifies stored size, MIME and container signature before attaching a ready video. A performer may not attach someone else's upload.
- Public player: click-to-load 16:9; no player fetched before a viewer chooses to watch; responsive, EN/RU/ES. YouTube uses `youtube-nocookie`.
- No auto-publishing to YouTube; no automated HeyGen renders. Do not use Google Drive as public CDN. Public bucket should contain no client data; actual uploaded files can be accessible even before moderation if someone knows an unguessable object path (platform moderation controls display, not storage access).
- Schema deployment: apply `supabase/migrations/20261017164000_hh_practitioner_presentation_videos.sql` to the existing Holistic House Supabase project before enabling live uploads. Validate bucket public flag, 25 MB cap and allowed MIME types.
- Rollback: remove presentation component and upload endpoints; retain bucket and private asset rows until the owner decides how to remove uploaded public media. Old profiles/services continue working without videoPresentation.
