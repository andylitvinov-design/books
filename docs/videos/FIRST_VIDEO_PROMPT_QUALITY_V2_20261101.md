# Holistic House Video Director — native prompt compiler v2
Date: 2026-11-01. Production base: codex/public-book-library.

## Observed gaps
The first video editor and Cinematic Director have separate filter state. Native video prompt previously listed scene IDs, theme, aspect and length but omitted pace, music, captions, local export settings and visual exclusions. Free text was classified by the registry's motif order instead of positive subject mention order. External text model responses were accepted for syntax/length, not conflicting visual constraints.

## Changes implemented
- Visual intent: positive visual subjects in user mention order; negative mentions separately. No raw visitor text in motif metadata.
- Native prompt: effective theme/pace/music/captions/exclusions and (when supplied) HD/Full HD, brightness and volume alongside the four real approved scenes. Actual montage is still selected exclusively by verified local plans.
- AI request contract: optional directorSelections with exact question/option ID allowlist from the existing question registry, scoped shot validation (1-4), no custom free text, portraits, profile, test results or new provider permissions. This is an editorial-only bridge; Cinematic UI is not yet wired to the first-video UI. No unsupported visual effect is claimed as rendered.
- Provider context: positive visual intent, explicit negatives, precedence and continuity/no-flicker defaults. User selections outrank defaults; verified local assets and safety exclusions outrank narrative embellishment.
- Lightweight semantic rejector of AI replies that positively depict excluded objects or add captions/music when explicitly off. Existing free text provider failover and deterministic local fallback remain in place.
- Existing same-origin, consent, rate-limit, free-only model and bounded JSON constraints preserved.

## Compatibility
Legacy v1 requests without directorSelections continue unchanged. No new paid APIs, XP billing, client profile data or AI video generation. The requested advanced options remain metadata until one editor state is deliberately unified after upstream #2900/#2913. A true new photorealistic video render still requires separate approved provider.
 
## QA / release
Run existing Node 22 first-video-director tests (including new prompt tests), syntax, scoped ESLint, tsc --noEmit and production build on exact PR HEAD. Next integrate advanced selection state with the Video Director Chat only after #2900 is merged and browser QA passes. Verify Vercel READY exact production SHA before marking LIVE.