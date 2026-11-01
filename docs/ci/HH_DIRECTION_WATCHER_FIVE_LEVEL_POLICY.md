# Holistic House — Direction Watcher & Five-Level Priorities

## Управление направлениями, а не отдельными PR

**Единственный источник приоритетов:** .github/hh-pr-directions.json. Все PR наследуют уровень P1–P5 от своего направления. Менять важность отдельного PR через hh:priority:* больше нельзя. Старые hh:priority:p0...p3 удаляются классификатором.

| Level | Directions | Usage |
|---|---|---|
| P1 | platform, video | GitHub/CI, Watchdog, AutoMerge, production stability and Video Studio |
| P2 | audio-hypno | Voice/TTS, audio, music, hypnosis, affirmations and video therapy audio |
| P3 | messenger-crm, orders-payments | Messenger, Telegram, CRM, applications, orders, service payments |
| P4 | cabinet-diagnostics, academy-courses | Cabinet, tests, reports, Reiki Academy and courses |
| P5 | seo-growth, content-design, other | SEO, content, cosmetic design, experiments, unclassified |

To change one direction for every PR, modify its level in the central JSON and merge that policy change into the trusted default branch codex/bootstrap-books after passing contract CI. The next classification cycle updates numeric level labels. Watchdog/Repair/CI rankings read the new policy after deployment.

## Two agents

**HH PR direction watcher:** .github/workflows/hh-pr-direction-watcher.yml
- Runs every 10 minutes at :01/:11/... UTC. Supports workflow_dispatch real and dry-run audits.
- Inventories all open PRs; classifies production PRs and trusted default-branch infrastructure PRs using trusted scope/title, with a bounded changed-path fallback for vague titles.
- Adds hh:direction:<slug> and hh:priority:<1..5>, removes superseded managed labels without replacing unrelated Repair, conflict, CI or security labels.
- Creates eleven direction labels, eleven optional override labels and five numeric priority labels idempotently.
- Uses existing GITHUB_TOKEN only; no paid external AI agent, API or server.
- Reconciles at most 18 PR labels per cycle. Full-inventory counts and pending work are reported in Actions. Initial catch-up takes multiple cycles.

**HH PR 10-minute watchdog:** .github/workflows/hh-pr-ten-minute-watchdog.yml
- Ranks by direction level, not individual per-PR priority overrides.
- Inspects highest-priority preliminarily free PRs in fast slots while auditing older work via a separate rotating window.
- Checks available CI capacity; dispatches a real Repair Worker for the highest-ranking queued source PR using its exact number and SHA.
- If the selected PR is already claimed, manually blocked or stale, Repair Worker tries the next queue entry in the same cycle.
- Existing dedicated CI bootstrap worker, native AutoMerge, SHA/branch protection, privacy/consent and owner leases remain hard gates. Priority alone never permits a merge.

## Labels and exceptions
- hh:direction:video and other direction labels are classifier outputs.
- hh:priority:1 to hh:priority:5 are classifier outputs, not manual PR rankings.
- hh:direction-override:video etc is an optional human classification correction. Its priority still derives from the central direction policy.
- Contradictory overrides cause the PR to be excluded from automatic priority dispatch until corrected.
- hh:repair-manual, hh:hold and hh:blocked exclude a PR from fast automatic repair selection. Production conflicts require safe source reconciliation, never force merge.

## Deployment verification
1. Actions → HH PR direction watcher: verify a completed real run, updated, pending, byLevel and byDirection counts.
2. Check sampled real PRs for correct inherited labels and preserved CI/Repair labels.
3. Actions → HH PR 10-minute watchdog: read priorityTop, repairNext, activeActions and blockedByCapacity.
4. Inspect Repair Worker exact-HEAD claims and fallback-to-next decisions. Verify Core CI and protected production merge independently.
5. Measure whether highest-level actionable PRs are selected first without starving lower-level work.

**Current capability boundary:** Repair Worker safely handles narrow ESLint autofixes, stale queue cleanup and manual conflict handoffs. It is not yet a general autonomous TypeScript/build/video/semantic-conflict coding agent. Direction priority cannot make those cases self-healing without a separately authorized capable source worker.
