# Merge Check Light v2: macOS real media impact

Root cause: static PR branch-name prefix lists turn intentionally skipped macOS WebKit jobs red on harmless UI changes, and can miss new codec branches.

## Source-of-truth

The `webkit_preflight` job verifies GitHub's synthetic merge `HEAD^1` tested production base and `HEAD^2` unchanged proposed PR head. It evaluates `git diff --no-renames --name-status -z HEAD^1 HEAD` with `lib/ci/merge-check-light.mjs` loaded from the **trusted tested BASE**. On initial installation/unknown policy it schedules macOS instead of bypassing. This cannot be weakened by a candidate PR altering that classifier.

- The `voice-webkit-macos` job now uses `needs.webkit_preflight.outputs.media_required`, not history-dependent head branch names.
- Actual decoder/voice API, MP4, codec, recording, shared renderer, timeline and media source changes still require executed macOS WebKit and all associated provenance/consent/encoded-audio QA. Stories Studio source also sets trusted `stories_required` to run the genuine five-scene movie check independently of branch naming.
- Browser assertion, ordinary Ideas UI/text and nonmedia CSS changes can skip macOS *only when the BASE-owned impact predicate returns false*. Its focused Mandala unit job remains mandatory.
- The required `hh-merge-check` independently verifies both the BASE-owned macOS job and an unchanged preflight body before accepting a skipped Mac job. A PR editing a workflow cannot self-certify the skip. Failed/unfinished jobs still block.
- The old static conditional syntax remains supported in the Specialist only for already in-flight runs tested against an older production base. There is no GitHub ruleset/branch protection bypass.

## Rollout

One atomic protected PR, exact-head actionlint, Core, specialist evidence and native auto-merge. First rollout conservatively runs macOS. Actual production deployment is separately verified; no manual Vercel promotion or additional paid providers. Compare CI minutes and failure reasons across at least 30 real PRs before claiming any percentage improvements.
