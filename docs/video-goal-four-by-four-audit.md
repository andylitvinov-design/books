# Video Studio: four distinct video + four distinct audio assets per scenario

Canonical production structure: **5 categories / 30 topics / 120 scenarios**.
Each category contains 6 topics × 4 scripts; each script has 4 visual beats.
One MP4 asset assigned to two beats is not four unique videos.

Run from repository root:

\`\`\`bash
node scripts/audit-goal-tree-av.mjs
node scripts/audit-goal-tree-av.mjs --json > /tmp/goal-tree-av.json
node scripts/generate-scenario-melodies.mjs
node scripts/audit-goal-tree-av.mjs --physical
node scripts/audit-goal-tree-av.mjs --physical --strict
\`\`\`

\`--strict\` intentionally fails until **all 120 scenarios** have four different, individually approved video bindings, four different real audio recordings, unique files within each category, and byte/hash proof on disk. Run after audio prebuild. The audit never imports, renders or purchases stock, does not call AI providers and does not modify live metadata.

## Baseline from 2026-11-03 production source

| Axis | Current source-backed status |
| --- | --- |
| Canonical categories / topics / scripts | 5 / 30 / 120 |
| Actual approved source MP4 catalog entries | 44 |
| Four-beat storyboard slots | 480 |
| Reviewed and rights-verified MP4 bindings | 0 / 480 |
| Four-audio-ID assignments | 480 / 480 |
| Globally distinct scenario audio IDs | 192 |
| Distinct audio IDs per category | 96 / 96 |
| Distinct audio IDs per topic | 16 / 16 |
| Export-ready new scenarios | 0 / 120 |

The MP3s are **generated during prebuild**. Source IDs and a green manifest test are NOT proof that every physical file is present on a particular deployment. Use \`--physical\` after the build and independent playback/decoding QA in specialist CI.

The physical checker verifies file presence, minimum bytes, media container signature and SHA-256 identity. It is **not** FFmpeg frame/audio decode evidence and does not independently confer usage rights.

Source matchmaking produces *editorial candidates*, not approved bindings. The existing PR #3082 adds proposed visual matches and #3103 provides a private review surface; they must pass release policy and genuine owner/source proof before any candidate can count. Never upgrade \`candidate\`, \`unbound\` or a storyboard's four named motifs to a real exportable video.

## Acceptance and acquisition policy

1. Every approved story must use four **different source MP4 files** (unique IDs and hashes) and four different valid MP3 recordings; one file shown four times does not qualify.
2. Every approved visual beat needs a safe same-origin MP4 from the existing approved-source whitelist **and** \`rightsVerifiedForThisBinding:true\` from an authoritative reviewed plan. A script has \`canExport:true\` only after rights/source review; a user's text or tag similarity is not approval.
3. Within each category, the 96 visual placements and 96 audio placements should be distinct. Cross-category source reuse may be allowed if editorially appropriate and licensed; global exclusivity across all five categories would require at least 480 unique video masters, versus the current 44, before thematic suitability review.
4. Maintain EN/RU/ES names and concept links; no public placeholder or fabricated asset path. Never automatically claim export readiness or trigger expensive render/acquisition to fill gaps.
5. Full sign-off requires exact commit checks, ffprobe/FFmpeg decoded evidence, rights review, media export with sound, correct LIVE deployment SHA and browser smoke.

This audit is non-blocking for unrelated development by default; the independent final release acceptance command is explicit \`--physical --strict\`. The existing \`goal-tree-audio-playlists.test.mjs\` specialist CI suite exercises per-category/scene counts and spoof-negative cases.
