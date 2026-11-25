# Holistic Video Discovery — HackerTube-inspired reverse engineering

Date: 2026-11-02. Production destination: codex/public-book-library.
Existing canonical route: /{ru,en,es}/library?view=videos.

## Reference and provenance
Karpathy's HackerTube overview https://karpathy.bearblog.dev/hacker-tube/ describes a corpus mined from Hacker News user recommendations, deduplicated YouTube links, LLM categorization, 150 subjects and a no-account For You experience. Reported counts are author claims. No HackerTube application code, content database or copyrighted media is copied.

## Already existing in Holistic House
- Public LibraryHub + LibraryFeed; play-on-demand Youtube-nocookie player and search.
- lib/public-library-feed.ts reads approved **published** practitioner YouTube materials only.
- Verified public Academy records, Greek teaching series and teacher-provided English meditations.
- EN/RU/ES route, site navigation, mobile styling, no duplicate account/API.

## v1: No-cost reusable personalized catalogue
- Add only explicitly published original YouTube videos and Academy recordings with verified_legacy_public_embed status, no client-session/private recordings.
- Editorial topic taxonomy: calm/stress, energy, relationships, work, meaning, practices; explicit labels beat keyword guesses. Keep recordings in their original audio language; a translated title is not dubbed content.
- Deterministic, transparent For You ranking: editorial verified-source preference, voluntarily bookmarked topics, source variety. No LLM queries on a page view; no external network requests to score or classify.
- Select goal, original audio, sorting, saved-only, not interested. Persist **only voluntarily saved public video IDs** in the user's own browser. Hidden IDs and goals remain ephemeral. Provide an explicit clear/reset.
- No manufactured duration, ratings, verified playback claims, subtitles, or medical guarantees.
- User focus is a recommendation preference, not diagnosis. No tests, client identifiers, medical information or private account content are accessed.

## v2: controlled ingestion pipeline (not claimed live in v1)
1. Import only permitted editorial source links, approved practitioner recommendations, opt-in educational public posts and owner-vetted playlists. Preserve source URL, quote/excerpt within licensing, time, author, channel, actual original language and reason-for-recommendation; dedupe by 11-character YouTube ID.
2. Retrieve official YouTube metadata with an authorized API if available; get actual duration, thumbnail, playback state, captions and embeddability. Run rechecks for private/deleted/misrepresented videos.
3. Batch categorize offline by deterministic rules and optional Gemini/Claude/other classifier to normalized JSON taxonomy with human review. Avoid passing profiles or health data to external models. Fact-check AI labels, handle uncertainty, safety, inappropriate claims, copyright and rights; keep source attribution and versioned tags.
4. Publish only owner-approved content through existing public catalog/material editorial pipeline. Store moderation provenance, rejection and reason, with deletion mechanism and logging. Do not download/rehost third-party content or auto-publish their audio.
5. After a separate user consent, optional private goal/profile recommendation service could incorporate assessments with protected server-only permissions, opt-out and deletion; never place results in URL/localStorage or external LLM prompts.

## Release acceptance
Run node --test tests/video-discovery.test.mjs, scoped ESLint, TypeScript, Next build, and Chromium/WebKit existing /ru/library?view=videos at 320/354/390/430px, plus EN/ES. Verify goals, save/reset and reload, original language, verified corpus only, series ordering and YouTube click-to-play. Observe exact-head required CI and protected merge, then verify Vercel project READY production SHA and rendered canonical-domain user journey. Code merged is not live unless verified.
