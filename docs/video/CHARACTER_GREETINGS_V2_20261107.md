# Holistic House · Character Greetings V2 (30 free animated characters)

**Implementation package · 7 November 2026 · local source, NOT LIVE**

## Product behavior

- Exactly 30 selectable, individually rendered 2D characters: fantasy 8, animals 8, people 6, spiritual/gentle 4, festive 4. EN/RU/ES titles, gesture captions and filters.
- **Off by default** (`none`). A deliberate opt-in offers `Auto` (based only on the selected scene name / broad theme), or any particular character.
- Visible categories and a compact six-choice recommendation rail before the existing **Generate free video** button inside PRO; the user never has to regenerate a paid/XP film just to choose the greeting.
- Original scenery continues through the final 3.5 seconds. The character is painted **on the same Canvas** after scenic layers and before existing affirmations/brand, with subtle fade, bob, waving/flapping/nodding and ground shadow/tonal adjustment. This is **illustrated 2D foreground compositing**, not true AI 3D re-lighting or depth-aware physical occlusion.
- Same deterministic local timeline for preview, MediaRecorder and WebCodecs/AAC export; an explicitly requested outro preview starts any already attached and permitted audio at the outro offset; no invented media assets, no public/private clip upload.
- EN/RU/ES; no need to sign in to choose and preview, existing user-gated output and XP balance remain untouched.
- Extra character price **0 XP**. The normal charge for video generation remains unchanged; users do not get a free video merely by choosing an add-on.

## Files

- `lib/mandala/free-greeting-catalog.mjs` / `.d.mts`: 30 registered options, locales, categories, deterministic scene recommendation.
- `lib/mandala/free-greeting-overlay.mjs` / `.d.mts`: original Canvas artwork for all 30 entries and final timeline cue.
- `components/mandala-free-greeting.tsx` / `.module.css`: compact one-screen mobile picker.
- `components/mandala-free-video-studio.tsx`: one existing renderer, touched by guarded offline patch only.
- `tests/mandala-free-greeting.test.mjs`, `tests/mandala-free-greeting-integration.test.mjs`.
- `scripts/apply-free-greeting-patch.py`: offline all-anchor guard; refuses source drift/duplicate files.

## Integration contract

Target `andylitvinov-design/books`, protected site base `codex/public-book-library`. Read `AGENTS.md`, `CLAUDE.md`, current global `GLOBAL_PR_ONE_PUBLISH_V1`, project CI canon, task owner lease and Vercel cost gate. The patch is fully staged off-network and is not a GitHub PR.

1. Extract package; obtain the current production source tree from an **authorized local clone**. Do not blindly rewrite files when another open PR owns the same defect.
2. Run `python scripts/apply-free-greeting-patch.py /path/to/books --dry-run`. Must find precisely five Canvas hooks and all unique source anchors.
3. Run it without `--dry-run`; it creates nine new files and edits only the existing Video Studio TSX.
4. Verify `node --test tests/mandala-free-greeting.test.mjs tests/mandala-free-greeting-integration.test.mjs`, `npx tsc --noEmit`, targeted linter, Next build, 320/354/390/430px screen, Safari/Chromium, one actual MP4 export, audio persistence, longer and shorter source scenes, user photo consent, no timeline regressions.
5. Only after verified CI/preview **cost and owner gate**: prepare the full reviewed patch as one commit/ref update, open exactly one PR, freeze HEAD until real required current-SHA Core/Specialist/Guard checks pass; use protected native merge. Never force push or bypass required checks.
6. LIVE acceptance: independently verify merged site SHA deployed under canonical `holistichouse.vercel.app`; use real Video Studio UX Goal → Ideas → Montage → PRO → pick auto/specific → preview → generate → Ready; confirm exported file visibly includes the scene-matched greeting and preserves audio/branding on Safari and Chromium.

## No-extra-charge guard

- No new render service, external character API, TTS, cloud/AI provider, job, storage bucket, workflow, cron or runner.
- Drawing is entirely from original Canvas primitives. The optional picker adds **no XP cost**; it does not relax credit/consent checks.
- Repo currently has GitHub/Vercel automatic deploy integration. A new remote branch/ref/PR may trigger metered CI/preview even when code itself calls no provider. **Do not remotely publish if the no-additional-charge guarantee is not confirmed**: `HOLD_COST_UNVERIFIED`, preserve the local package.

## Known constraints / follow-up after release

- Characters are original stylized artwork, not verified external 3D animations. They sit over the final video with approximate ground anchoring and brightness sampling; they cannot appear physically behind arbitrary foreground objects.
- Some scene IDs are abstract; the explicit user selection always wins. Auto falls back to broad theme for unknown names.
- High contrast foreground/caption collision and all combinations of legacy source film formats need real browser QA; no guaranteed placement without segmentation.
- If Canvas recording is unsupported, existing source-MP4 fallback **must not** claim to have inserted the character; the patch explicitly blocks misleading fallback when a character is chosen.
- No monetization/backend change, source repository migration, new dependencies or hidden video-upload process.
