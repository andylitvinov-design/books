# Agent Commander Skills Hub V1 — release contract (2026-11-07)

- Canonical standalone URL: https://holistic-house-pr-monitor.vercel.app/skills.html
- One source of truth: `ops/pr-monitor/skills-library.json`, first-party curated catalogue, 27 core recipes and 3 review-only legacy repair recipes.
- `commander-skills.js` loads the catalog on demand, scores the user task, recommends 4 skills including task architect/reviewer, composes editable executor prompt and exports SKILL.md. All rendered text uses textContent, no arbitrary HTML.
- Task intake augments the four-part brief with selected procedures (existing owner-only free AI decomposition optional; no private AI for guests).
- Existing public Project Management has a contextual handoff to selected subtask skills, preserving task IDs, no task DB fork.
- `agents.html` includes Skills Hub entry; fixed five-tab dock unchanged. On-demand selection/download is NOT executing, installing in Codex, writing repositories or granting permissions.
- Unreviewed/external skills cannot auto-enable. PR repair recipes are review_only; no self-modifying worker and no cost. No extra cron or API.

## Functional acceptance

1. Load skills.html and catalogue with 30 valid unique skills, no secret.
2. Type «исправь Merge/CI» and see specific CI/merge/PR skills plus planner/reviewer.
3. Select a PM subtask and view a curated skill bundle; preview, copy, download SKILL.md.
4. Create a voice/text task and press «Разобрать задачу»: four required blocks preserved, additional skills appended; failure to load bundle preserves base brief.
5. 320/390/430px, VoiceOver labels, bottom dock, original graphs/API, restricted owner-only AI all work.
6. Repo source publication + exact-head CI + protected merge + standalone full source manifest release + canonical alias readback. Git merge ≠ production proof.

## Pending independent work

Persist skill-run receipts, skill promotions and trusted executor invocation require a separately protected owner backend and attested source worker. The UI may prepare an agent prompt but must not claim it installed skills into a remote Codex/GitHub runner.
