# Openverse sound effects for approved Holistic House video edits

This is an **optional local post-production stage** after a finished MP4. It does not run from Telegram messages, add external calls to the site, call HeyGen, publish to YouTube, or send photos, audio, client text, health data or filenames to Openverse.

## Workflow

1. Obtain an already approved, non-sensitive public video MP4 from the existing owner pipeline. Keep private/client MP4s private and do not include their content or descriptions in an Openverse query.
2. Watch the scenes and prepare a short, generic cue sheet: sound type, search words and exact timeline start. A model may propose cues based on **approved scene descriptions**; **review the placements and licenses before publication**. Automated image/frame analysis is not implemented here.
3. Save a JSON plan next to the MP4, for example approved-sfx-plan.json:

~~~json
{
  "video": "public-master.mp4",
  "output": "public-master-sfx.mp4",
  "cues": [
    {"type": "soft-whoosh", "query": "soft whoosh transition", "atSeconds": 4.2, "durationSeconds": 1.5, "gain": 0.12},
    {"type": "button-click", "query": "short button click", "atSeconds": 9.1, "durationSeconds": 0.5, "gain": 0.10},
    {"type": "button-click", "query": "short button click", "atSeconds": 19.6, "durationSeconds": 0.5, "gain": 0.10}
  ]
}
~~~

4. Run from the repo with Node 22+ and the existing ffmpeg-static dependency:

~~~sh
node scripts/openverse-video-sfx.mjs /absolute/path/to/approved-sfx-plan.json
~~~

The tool creates sfx/ next to the plan, looks up each **unique sound type at most once**, checks the **returned** license/source as well as URL safety, downloads a candidate using shell-free curl with HTTPS-only and a 10 MB cap, and validates audio file magic. It reuses a valid cached file on repeat runs. The sfx/manifest.json keeps provenance, the sfx/credits.txt contains each Openverse attribution string **verbatim** with a newline between entries, and media are reused for later cues of the same type. Keep these next to the final MP4 archive. The video output is a new MP4: original video track is copied; speech/music remains and cues are overlaid at the supplied timestamps, with volume limiting. Original MP4 is untouched and an existing output is never overwritten.

The search URL is https://api.openverse.org/v1/audio/ with exactly **license=cc0,by,pdm** and **source=freesound,jamendo**. Search words must be generic: never send names of clients, symptoms, messages, phone numbers, or private source text. For a cache miss, the script consumes one query for that type; it tries up to four candidates from that **same response** if the first file is corrupt. Local budget is capped at 180 searches per day per sfx/ directory; Openverse's own rate-limit/429 always takes precedence. There is no API key and no paid SFX provider. Downloads require curl; the media must originate on approved Freesound/Jamendo HTTPS domains. A provider redirect to any other host or unsupported format fails rather than bypassing the policy.

## Prompt addition for a scene-analysis model (e.g. Opus)

> When the approved video project is missing a suitable sound, use only Openverse audio search at https://api.openverse.org/v1/audio/. Restrict every query to license=cc0,by,pdm and source=freesound,jamendo; make no more than one search per sound type and respect all live rate limits. Do not search private descriptions, faces, voice recordings, or health details. Propose a JSON cue sheet with short generic English queries, exact scene timestamps, subtle gains and durations. Use the approved post-production script to download into sfx/ via curl and copy the exact attribution for each selected asset into sfx/credits.txt without changing its words. Do not publish or generate a new HeyGen render; return the preview and credits for human approval.

## Licensing, privacy and QA gate

- Openverse indexes third-party material but **does not verify licensing guarantees**. For each proposed cue, inspect the actual Freesound/Jamendo landing page and license. The strict filter only accepts CC0, CC BY and PDM. **CC BY attribution must travel with the published video** (for example, in the YouTube description/credits), including relevant source/license links. PDM/CC0 metadata is retained for traceability.
- Do not silently use result snippets, screenshots or third-party download URLs from other hosts. An invalid source, response, 429, no licensed match or corrupt download fails closed; no new MP4 is published.
- Check the volume against narration, start/end of each sound, all scenes, lip-sync, captions, video aspect ratio, final credits.txt, and any venue/music rights before use.
- **Do not add an Openverse API call or downloaded sound to the private owner Telegram webhook by default.** It is an optional, reviewed, non-sensitive post-production action. A future admin UI would require a separate owner approval, validation, auth and server-side quota/SSRF review.
- Final QA -> Drive master archive -> explicit YouTube/Metricool publication approval. A generated MP4 is not a published video, and a CI pass is not proof of provider playback.

Related: [Video SOP](https://github.com/andylitvinov-design/ai-projects-brain/issues/219), [Telegram owner video](https://github.com/andylitvinov-design/books/issues/2160).


## Local scene-cut suggestion — 2026-10-27

Optional **offline proposal stage** for finished, explicitly approved **non-sensitive/public** MP4s:

~~~sh
node scripts/propose-openverse-video-sfx.mjs /absolute/path/to/public-master.mp4
~~~

This calls only the existing bundled ffmpeg-static executable, **never** sends video, audio, speech, transcript or frames to Openverse/HeyGen, never downloads sounds or writes to the original MP4. A single local sibling *-sfx-proposal.json report is created with mode 0600; existing proposals are not overwritten. Input must be an ordinary local MP4 up to 250 MB and 120 seconds.

The read-only FFmpeg scene detector finds strong hard cuts (scene threshold 0.30), ignores cuts at start/end and within 2 seconds of the previous cut, and proposes up to six **quiet** generic soft-transition cues. Proposed cues all reuse the same sound type and query, so the downstream Openverse script searches just once per type. No facial action recognition, semantic scene understanding, speech transcription or automatic sound placement outside montage cuts is claimed.

If decision=no_scene_sfx_needed and plan=null, stop: **do not invent whooshes, clicks or ambience for talking-head videos**. If decision=review_required, inspect all cuts, listening/lip-sync and source licensing; only after explicit approval save **the nested plan object** as a separate approved-sfx-plan.json next to the MP4, then run the existing node scripts/openverse-video-sfx.mjs /absolute/path/to/approved-sfx-plan.json. The Openverse script will create a new MP4 with a different name and exact credits; it never auto-publishes.

**Real approved public-master acceptance on 2026-10-27:** 2026-09-29_holistic-house_psychic-alchemy_en_avatarV_16x9_v03.mp4 (Google Drive master ID 1emF7Peqk8SFz0UVj3hm_k2RwUOa5xpi4), verified SHA-256 72df69bec19a2dd287a1e33dc19e3c48e3cd0039b04020a7457f67ba5a749422, 1920×1080, 26.760 seconds, single continuous Andrey talking-head shot, zero hard cuts at threshold 0.30. Decision: **no scene SFX**. The source video is unchanged. An independently generated synthetic two-scene MP4 provided a positive hard-cut test and preview-plan assertions. These tests do **not** certify subjective audiovisual QA or third-party license rights for a future different video.
