# My Coach · four-person living portrait pilot · 15 Nov 2026

Owner: show **exactly four** discoverable fictional AI coaches — Mira and Sofia (women), Max and Alex (men). Other four personas stay in the internal editorial registry for old reports/links, but are not discoverable in the public catalog, tabs, search, favorites, hero rail or cards. Human practitioners remain in their own tab and keep genuine human portraits.

## Media

Replace the jerky **six-frame animated WebP** presentation in the active four with first-party silent 24 fps H.264 MP4 loops, 328×456, 3.5 seconds, four visual states per coach: greeting, idle, listening, speaking. 16 optimized clips total, only about half a megabyte as original files. Every clip uses the same original fictional face and is produced offline from the existing generated photographs, with frame interpolation and small local expression edits. There are no API calls, paid models, storage/database migrations, third-party playback providers, voice clones, photorealistic lip-sync claims or new production env keys.

The four states are driven by existing REAL voice UI events: before beginning greeting; while speaking speaking; while user mic listens listening; otherwise idle. Decorative videos are silent, muted, inline, autoplay only when visible and only when reduced-motion is off. IntersectionObserver and page visibility pause/unmount hidden videos. A static per-persona WebP poster is always present as a no-JS, slow-network, no-autoplay or reduced-motion fallback. Swiper's four small portrait thumbnails stay **static** to avoid wasting concurrent decoders. The existing sound/ASR/consent/session controls remain authoritative and untouched; video speech is not an audio waveform/phoneme-tracked performance.

## Release QA

Use one atomic production branch PR with existing protected Core/Specialist/browser checks. Verify no duplicate/hidden personas under All, AI only, Favorites (including stale saved IDs) or suggested filters, and distinct identities everywhere. Check public EN/RU/ES routes, guest and signed-in navigation, 320/354/390/430px, Safari autoplay/reduced motion, 4 MP4 states per persona, mic and audio still working independently. Verify deployed READY+SHA+alias after merge; source tests alone cannot claim visual or real conversational acceptance.

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES