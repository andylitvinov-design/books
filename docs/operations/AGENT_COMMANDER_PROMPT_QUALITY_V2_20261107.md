# Agent Commander · Semantic Prompt Quality V2

**Date:** 2026-11-07 · **scope:** \`ops/pr-monitor/commander-task-input.js\` and the existing first-party Task Architect skill.

## Verified root
In the 2026-11-07 owner's voice example, "не разобраны" describes a backlog of PRs, not a request for task-decomposition tooling. The old broad trigger \`/разобра|агент/\` incorrectly generated "Преобразовать свободное описание..." as the first product subtask and dropped PR categorization, original PR discovery and completion.

## Contract
1. Preserve the literal owner transcript and supplied URLs/numbers. Mark likely speech errors; never auto-correct them into unverified commands.
2. Determine main **object → action → result** before applying generic process rules; distinguish PR classification, task-authoring, microphone, audio-to-video and general requests.
3. Detect continuation ("уже ставил", "найди PR", "доделай") and instruct the executor to locate and audit prior work before building anything duplicate.
4. For PR classification, require complete open+Draft inventory, categorization into functional directions/tasks, explicit unknown bucket, real statuses, coverage checks and mobile task tree.
5. Produce separate acceptance criteria per substantive action. Keep the first four mandated WHAT / GOOD RESULT / BENCHMARKS / CONTEXT sections and user-editable copy/transfer flow.
6. Reuse the owner-only, currently verified OpenRouter **free-only** optional enhancement. AI proposals remain appended and must not replace the local owner intent, user edits or verified sources.
7. No new provider, task execution authority, token, billing, workflow, polling or automatic live claim.

## Acceptance
- Unit regression based on the owner's **verbatim noisy transcript**: first step finds earlier task/PR; categorization, completion and LIVE checks appear; template-authoring false positive absent.
- Existing voice + explicit "разбор задачи" still supplies task-authoring/microphone steps.
- Generic prior PR, audio-to-video and other product prompts stay meaningful without fabricated PR numbers.
- Original transcript preserved; all four sections present; generated local brief remains editable and safe when the optional AI API is down.
- Physical iOS and release verification still required after protected merge.

## Release route
Existing control-plane base \`codex/bootstrap-books\`, full coherent HEAD, exact-HEAD checks. Existing standalone PR Monitor uses a manually deployed full source manifest; never release only this partial repo directory. After merge, overlay the changed script/skills onto the verified full Vercel manifest, verify generated prompts and historical monitor routes. \`MERGED\` is not \`LIVE\`.

References:
- https://github.com/andylitvinov-design/books/pull/3866
- https://github.com/andylitvinov-design/books/pull/3875
- https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md
