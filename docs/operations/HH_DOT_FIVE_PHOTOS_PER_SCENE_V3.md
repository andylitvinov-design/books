# Dot: five photos per authored scene, each orientation

This release introduces a server-only Supabase catalogue for owner-confirmed
video montage. Editorial suggestions are NOT literal plot footage or proof that
a remote JPEG decodes until verified during rendering.

## Canonical denominator
- 256 MyTube scenarios x 6 plot variants = 1,536 plots.
- 1,536 x 4 canonical narrative beats = 6,144 authored scenes.
- 6,144 x 5 photos x 2 native orientations = 61,440 choices.
- 12,288 scene/aspect groups each hold exactly five different photo and
  original IDs. 9:16 uses portrait; 16:9 landscape sources only.
- Existing First Light source bindings are retained. Other plots use
  semantic suggestions rather than asserted scene-accurate documentary footage.

## Tables and provenance
- public.hh_video_plot_scene_briefs_v3: MyTube RU/EN actual plot beats.
- public.hh_video_plot_scene_choices_v3: 5 ranked candidates per beat/aspect.
- public.hh_video_photo_catalog_unified_v2: Pexels, Wikimedia Commons,
  reviewed first-party film stills, tags, source, licence, dimensions.
- public.hh_video_plot_scene_photos_v3: backend RLS-scoped 5-photo reader.
- Renderer reads all 4 beats with one bound SQL lookup, 20 rows total.

## Editorial matching distribution
- 7,594 strong tag matches.
- 25,693 partial tag matches.
- 28,105 CATEGORY_FALLBACK (thematic only; 45.7%).
- 48 previously reviewed scene bindings, but their new choice status is
  still editorial_review=suggested. Do not claim every image depicts the script.
- Choices are metadata_verified, not physically_verified on import.

## Render security and acceptance
1. Owner selects plot, output orientation, YouTube target and audio in Dot.
2. On explicit render confirmation, backend RLS reads 20 candidates for
   four authored beats and resolves four different original sources.
3. Validate strict Pexels, Wikimedia Commons or existing first-party URL
   allowlists, original-source IDs, licence and creator metadata.
4. Fetch only selected JPEGs with redirects prohibited, bounded 5MB stream,
   JPEG magic, FFmpeg decode and actual aspect-ratio validation.
5. Build a private H264/AAC four-shot MP4; verify real audio-length sync,
   size and output codec before returning a Telegram preview.
6. Persist actual used original IDs, photographer, source pages, licence and
   SHA256 and append immutable credits on YouTube publish and metadata edit.
7. Category symbolic images remain a safe, previously-approved fallback
   if upstream origin media is unavailable.
8. Never auto-publish, retry an uncertain YouTube upload or add paid services.

LIVE requires exact-head Core/owner-video/hh-merge-check, protected merge,
scheduled Vercel production alias SHA readback and a real private Telegram
end-to-end MP4 with per-act scene photos in portrait AND landscape.
