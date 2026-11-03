# Reusable video at the bottom of a client's session report

Scope: **all authorized published homeopathy consultation session pages**, guest-only invitation, legacy cabinet and individually saved Google Cabinet report. No additional access to other sessions. The block appears after personal report, resources and exercises, before lower cabinet actions and confidentiality footer.

**Source:** HeyGen `1e4fb28d920f7fc4739d33e14061c56b`; Andrey verified Digital Twin, approved Russian cloned voice, Avatar V, 1080p, 16:9, **62.448 seconds** (exceeds the previous 60-second target by 2.448 seconds). Do not render another video as part of rollout. Source is a generic RU educational message, **not a personal medical instruction**; its dose comparisons are subjective and not supported as a scientific dose-response rule.

## Safe deployment / storage checklist

1. Review the existing finished HeyGen clip: identity/voice, script, pronunciation, lip-sync, hands, framing, opening/end, 16:9 and no private content. Do not claim QA from provider status alone.
2. Archive the reviewed 1080p master ONCE to the existing restricted `AI Videos/Homeopathy/Private/2026/` Google Drive folder; Drive is a master archive, never a playback CDN.
3. Upload one H.264/AAC MP4 of **at most 45,000,000 bytes** to the **existing** Supabase bucket `hh-client-private-media` (verify `public=false`), object key `shared/homeopathy/2026-10-15-granules-ru-v2.mp4`. Avoid duplicate copies per client. If the original exceeds the cap, retain the master in Drive and compress a playback derivative before upload. Confirm byte count and decode QA. Do not make a public bucket, YouTube/Metricool publish or direct HeyGen embed for this private page.
4. Respect the existing `HH_CLIENT_DELIVERY_ENABLED` production security gate: enable it only after existing Supabase secret-key provisioning, reviewed client authorization, A/B cross-client, revoke, preview and iPhone/Android playback tests. This change does **not** activate it.
5. **Only after upload and QA**, securely configure `HH_CLIENT_GRANULES_GUIDE_BYTES` to the exact object's integer byte size and `HH_CLIENT_GRANULES_GUIDE_APPROVED=true` in the Vercel environment. Keep both unset until then. Never place a secret or a temporary HeyGen media URL in source.
6. Re-test all three modes (guest, full cabinet, Google-saved); verify play/pause/seek (Range), no autoplay, subtitles/transcript disclosure, RU audio labelled on EN page, no block for Bach-only/non-homeopathic reports, no PHI in media requests, and source revocation behavior.
7. Check READY deployment SHA and authenticated mobile live readback before claiming the video is live. Rollback: unset `HH_CLIENT_GRANULES_GUIDE_APPROVED`, independently of the main delivery flag.

Backend: each viewer already authenticates the exact guest, full cabinet or saved account session. The one global educational video is streamed through the same authenticated, no-store, Range-capable first-party media proxy used by per-session assets; only a fixed allowlisted asset ID can trigger its static private object key. A failed or missing object does not relax session authorization.

UX: a low-page compact card, title and 1:02 duration, no autoplay; a conspicuous short statement tells the user to follow their individual prescription. Personal video instructions attached to the session remain separate earlier in the page. No extra clicks during report entry.

**Status on code merge:** UI/endpoint prepared behind default-OFF flags; until the master/archive/private upload/flag and QA steps above, this video is NOT LIVE in the client cabinet.
