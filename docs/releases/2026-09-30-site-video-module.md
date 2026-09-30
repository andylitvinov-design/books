# Holistic House: public website video module

Date: 2026-09-30 UTC.

**Status: the expanded module is implemented; its browser, preview, and live-release verification are pending.** The approved English About introduction is already live through HeyGen in the existing production source. This change preserves it and makes it editable; it does not represent a new upload or a verified deployment of the editor.

## Source and scope

- Repository: [andylitvinov-design/books](https://github.com/andylitvinov-design/books).
- Current verified upstream/production base: [`d32285c7c6a73b8be6abc7a721c9b8b659087f0b`](https://github.com/andylitvinov-design/books/commit/d32285c7c6a73b8be6abc7a721c9b8b659087f0b), including the already-live approved English About introduction hosted by HeyGen. The initial implementation and earlier baseline checks used `1b48b5560ef38399d48142665eb754466e0db279`; the work was synchronized with the newer production source before release.
- Implementation branch: `codex/holistichouse-video-module`. Final release commit, PR, and deployment evidence must be appended below.
- Architecture source: [ai-projects-brain #218 — Homeopathy AI Video System v2](https://github.com/andylitvinov-design/ai-projects-brain/issues/218).
- Publishing source: [ai-projects-brain #219 — AI Video Publishing SOP](https://github.com/andylitvinov-design/ai-projects-brain/issues/219). Its latest dated comment remains the source for current HeyGen IDs, Drive locations, and site URLs; those operational values are not duplicated here.

This change adds an authenticated editor at `/admin/videos` and reusable public video placements across the existing website. Each placement has separate English and Russian records. Unset, draft-only, and hidden placements produce no public video markup or empty video placeholders.

The existing English **Psychic Alchemy with Andy** introduction is registered as the initial `about-intro:en` publication. Its original special layout remains while that same approved HeyGen video is selected. Replacing it with a different video uses the shared player. The placement stays before the portrait/biography introduction, at its existing production position.

The existing five-item public navigation, complete About biography, consultation form, cabinet entry, remedy content/search, and book reader flows remain in place. The three existing About testimonials retain their original YouTube IDs: `m9RfDgK76PU`, `5oj0BIbLT4w`, and `MIVLm1GUTtM`. They now use the same poster-first player, with their video language identified as Russian.

**No new HeyGen generation, Google Drive upload, or YouTube upload is part of this implementation.** The module accepts existing YouTube links and stable HeyGen Share/Embed links. It preserves the HeyGen introduction that is already published on the website. Selecting a YouTube visibility value in the editor records the owner's choice; the editor does not change permissions in either hosting service. Client-specific/private videos are outside this module.

## Placement map

`{locale}` is `en` or `ru`. Individual remedy and book placements require an existing canonical slug or book ID, respectively.

| Slot ID | Page path | Position |
| --- | --- | --- |
| `home-intro` | `/?lang={locale}` | After the homepage hero |
| `about-intro` | `/{locale}/about` | Before the portrait/biography introduction, preserving the existing English video's position |
| `services-intro` | `/{locale}/services` | After the services hero |
| `service-business` | `/{locale}/services#business` | Inside the Business Constellations card |
| `service-alchemy` | `/{locale}/services#alchemy` | Inside the Alchemy of the Soul card |
| `service-archetypal` | `/{locale}/services#archetypal` | Inside the Archetypal Constellations card |
| `consultation` | `/{locale}/services#consultation`; also `/{locale}/about` | Before the consultation section on both pages; one shared record per language |
| `homeopathy-intro` | `/{locale}/homeopathy` | After the remedy search hero |
| `homeopathy-faq` | `/{locale}/homeopathy` | After the homeopathy introduction video |
| `remedies-index` | `/{locale}/homeopathy/remedies` | Below the directory heading |
| `books-intro` | `/{locale}/books` | Below the book catalog header |
| `remedy-detail` | `/{locale}/homeopathy/remedies/{slug}` | After the individual remedy's existing essence |
| `book-detail` | `/books/{bookId}?lang={locale}` | After the reader title/summary header, including the special Book 02 reference reader |

## Using the editor

1. Sign in through the existing practitioner/admin authentication, then open `/admin/videos`. Guests are redirected to `/admin/login`; both saving and refreshing records also require an authenticated admin session.
2. Choose the **video and page language**, then the website placement. For an individual remedy or book, choose its destination from the provided list. The editor's interface language follows the admin UI preference; it is separate from the selected content language.
3. Paste a YouTube link or stable HeyGen Share/Embed link and enter a title. Optional fields include a description, transcript, duration in seconds, and a Google Drive archive link. The archive link stays in the authenticated editorial record and is not rendered on the public page. The English About placement initially contains the already-published introduction and can be edited through the same workflow.
4. Use **Save draft** to retain work without changing the video visitors currently see. Unsaved edits remain available while switching placements or languages in the open editor; save them before leaving or reloading the page.
5. Check the poster and playback in the preview. Verify the correct person, voice, language, pronunciation, framing, script, and suitability for public visitors. For YouTube, website videos normally use **Unlisted**; **Private** videos are unsuitable for this public player. For HeyGen, enable public link sharing and check that the video opens without signing in. The editor shows the access guidance for the selected provider. Playback and embedding permissions still require checking in the hosting service.
6. Tick the review confirmation, then use **Publish to page** or **Update publication**. Editing any field clears the confirmation. Publishing creates a public snapshot of the current draft and revalidates the affected page; the shared consultation placement revalidates both Services and About.
7. Use **Open page** to inspect the destination in the selected language. Use **Hide from website** to remove the public snapshot while retaining the previously saved draft. Hide does not save new, unsaved form edits; use Save draft separately to retain those changes.

For the homepage, explicit `?lang=en` or `?lang=ru` takes precedence over the saved locale cookie. A valid saved preference is used otherwise; the default is English. Homepage metadata follows the same resolution. Switching its language updates the query parameter while preserving other query parameters and the hash.

### Accepted video links

YouTube keeps support for its existing video-link formats, including watch links, `youtu.be` links, and supported embed/Shorts/live forms. HeyGen accepts only stable `https://app.heygen.com/share/{32-hex-ID}` or `https://app.heygen.com/embeds/{32-hex-ID}` URLs, with an optional trailing slash. HeyGen query strings, fragments, credentials, explicit ports, other hosts, and expiring signed MP4 download URLs are rejected. Stored watch links are canonicalized; iframe URLs are constructed from validated IDs.

## Save, publication, and collision behavior

Each destination/language record contains an independently editable draft, an optional published snapshot, and a revision number. Saving a draft leaves the previous published snapshot unchanged. Publishing requires explicit review confirmation. Hiding clears only the published snapshot.

Writes use the editor's expected revision and an atomic Redis compare-and-swap operation. If another window changed the record, the stale write is rejected rather than overwriting it. **Refresh list and keep edits** reloads current server records while retaining all local form edits and clearing their review checkboxes. The owner can inspect the current publication, review the retained edits, and save again against the refreshed revision. A failed save does not discard the form.

The already-live About introduction starts at **revision 0** in the built-in registry. Its first admin edit uses the ordinary atomic absent-record-to-revision-1 write. A saved draft preserves the existing public introduction until Publish or Hide is explicitly chosen.

## Implementation and storage

- `components/site-video-manager.tsx` provides the authenticated EN/RU editor. `app/admin/videos/actions.js` validates admin access, destinations, revisions, and publication intent before storage operations.
- `lib/site-videos/model.js` owns the 13 slot definitions, keys, paths, strict YouTube/HeyGen source parsing, input validation, publication approval, and public-field projection. `parseSiteVideoSource` and `siteVideoWatchUrl` validate and canonicalize the supported sources. Arbitrary editor URLs are never passed directly to an iframe. The internal `youtubeUrl` form field remains compatible with existing records and accepts either supported provider; HeyGen display records have `youtubeId: ''` and a validated `heygenId`.
- `lib/site-videos/defaults.js` and its type declarations provide the public revision-0 record for the approved introduction already present in production. This registry contains only public display information and no Drive archive or client data.
- `lib/site-videos/store.js` reuses the existing **server-only** `PRESCRIPTIONS_KV_REST_API_URL` and `PRESCRIPTIONS_KV_REST_API_TOKEN` configuration. No new public environment variables or browser credentials are required.
- Editorial videos use the separate Redis hash namespace **`holistic-house:site-videos:v1`**. Record keys are `{slot}:{locale}` or `{slot}:{locale}:{entityId}`. The module does not read or write private client or prescription records.
- When storage is configured, persisted fields take precedence over the built-in publication. A saved hidden record remains hidden; a malformed persisted field also suppresses the built-in record instead of resurrecting the earlier video. The built-in value is used only when that field is absent. The first persisted edit follows the same compare-and-swap protections as subsequent edits.
- Serialized records have the same 200,000-character bound on write and read. This covers the permitted text fields and JSON escaping, preventing a valid long transcript from being accepted on write but discarded on the next read.
- `lib/site-videos/public.ts` is server-only. It reads once per React request, disables persistent Next.js data caching, and returns only approved public display fields: validated provider IDs, title, description, transcript, language, and duration. Drafts and Drive archive links are excluded.
- `components/page-video.tsx` resolves shared public placements. The About route uses the published record with the original `PsychicAlchemyIntroVideo` layout for the same approved English introduction; another selected video uses `SiteVideoPlayer` at that same position.
- `components/site-video-player.tsx` renders a responsive poster with a play button, transcript disclosure, and a safe provider-specific fallback link. The iframe is created only after a visitor clicks Play; it uses `youtube-nocookie.com` for YouTube or the stable `app.heygen.com/embeds/{ID}` page for HeyGen. Missing YouTube poster sizes fall back to an available thumbnail or the styled play surface. HeyGen shows an AI-assisted disclosure; only the already-approved Andy introduction uses his portrait and the disclosure identifying his digital twin and voice. Other HeyGen IDs use a generic Film poster and disclosure.
- The private-page CSP permits the required YouTube thumbnail, YouTube embed, and HeyGen embed origins specifically for `/admin/videos`; the other private cabinet routes keep their existing restrictions.

When storage configuration is absent, only the already-live approved About introduction remains available from the built-in public registry; no newly edited or unpublished video is supplied by that fallback. The editor reports unavailable storage and cannot save. When configured storage has a runtime connection/read error, the public read fails closed and returns no video records, rather than restoring a possibly hidden older publication. Other page content remains available. Runtime storage does not fall back to ephemeral memory. Malformed stored records stay hidden without exposing internal errors or private fields.

## Verification record

The following results were reported or verified during implementation. They must not be read as evidence of deployment.

| Check | Recorded result |
| --- | --- |
| Current-base TypeScript check (`tsc --noEmit --incremental false`) | Passed after provider/default integration |
| Current-base production build (`npm run build`) | Passed after all provider, default, and conflict-recovery changes |
| Video/provider model tests (`node --test tests/site-videos.test.mjs`) | 24 passed, including long serialized-record, strict HeyGen URL, and revision-0 coverage |
| Built-in registry/overlay regression coverage | 9 passed, including first save/reload, hide tombstones, malformed overrides, and competing first edits |
| Actual player server-render checks | Passed for both providers, no iframe before Play, correct portrait isolation, safe watch links, and rejecting mixed IDs |
| Existing navigation/cabinet and Book 02 checks | 8 passed during placement integration |
| Earlier complete unit-suite baseline | 8 failures reproduced at the unchanged old base `1b48b5560ef38399d48142665eb754466e0db279`; this is historical evidence, not the new base's final result |
| Existing About-introduction preservation checks | 4 passed after integration with the editable publication |
| Combined focused video checks | 37 passed; targeted ESLint passed |
| Browser editor workflow and mobile/desktop appearance | Pending |
| Authenticated preview, publish/draft/hide/collision end-to-end checks | Pending |
| Live deployment and public playback verification | Pending |

Before marking the release verified, append the final commit/PR, deployment URL and identifier, final check results, and the actual public placements checked. Record any temporary test records and their cleanup. Do not describe a video as generated, archived, uploaded, or published unless that operation was performed and verified separately.

## Rollback

For an individual published video, Hide from website removes its public placement while keeping the previously saved draft. For a code rollback, revert the video-module PR and deploy the reverted application through the normal release process.

Keep the separate `holistic-house:site-videos:v1` data during code rollback so editorial work remains recoverable. Do not flush the shared Redis instance, delete unrelated keys, rotate shared credentials, or change private client data as part of this rollback. No private client or prescription writes are required to install or revert this module.

A code revert returns the application to the current upstream behavior, including its original already-live HeyGen About introduction. Persisted hide/replacement choices stay in the separate KV data but are not interpreted by the old hardcoded component; review that existing introduction's intended visibility when rolling back.

## Release evidence to append

- Final commit and PR: **pending**.
- Final build/check results after review fixes: **pending**.
- Preview/browser verification: **pending**.
- Production deployment and live routes checked: **pending**.
- New video publication or temporary-test cleanup, if any: **pending explicit record**.
