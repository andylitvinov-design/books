# Holistic House · bounded Gauntlet Loop / OpenCode pilot

**27 October 2026.** Implementation: `lib/benchmarking/hh-gauntlet-loop.mjs`, `scripts/benchmarking/hh-gauntlet-loop.mjs`, two `.opencode/agents/hh-gauntlet-*.md`, independent regression tests and `.github/workflows/hh-gauntlet-loop.yml`.

## Goal and release separation

Use the existing Free Express v2 journey, not a duplicate app:

1. Public EN/RU/ES `/services/free-situation-review` opens at mobile 320/390/430px.
2. No enquiry without affirmative contact consent.
3. The initial POST creates **one** first-party request and receives an HH reference.
4. Optional questionnaire/media/Google steps continue the **same** request; never create a second lead or leak answers into tracking or messengers.
5. Protected account claim, owner inbox, response and CRM remain gated by existing server auth, encrypted storage and RLS; the pilot **does not mutate those areas**.

Two separate confidence levels:

- **`PASS_SYNTHETIC_ONLY`:** bounded AI review plus deterministic node tests, lint, TypeScript check, privacy/consent contracts. Browser smoke in `scripts/verify-free-express-wizard-v2.mjs` is synthetic interception only, and must be run separately where Chromium/WebKit are available. It does not prove persisted CRM, private account media or message delivery.
- **Real E2E:** a consenting tester submits to production; account holder sees precisely the same HH reference and private materials; authorized practitioner can reply; unauthorized owner is denied; transport/provider receipts are read back. This requires independent, authorized acceptance, is **not** run by this pilot and is **not** a merge condition for tooling-only files.

## Policy (before any AI)

- **Free allowlist only:** `opencode/glm-5.3-flash-free` (default) or `opencode/deepseek-v4.1-flash-free`. Model availability must be confirmed by the local OpenCode catalog (`opencode models opencode`) and current OpenCode Console pricing. Model ID mismatch stops; it never falls back to a paid model.
- Step 5 Preview may be evaluated separately **only after its actual price, opt-in and spending limits have been approved**; it is deliberately not selectable here.
- `--check` is the default and runs **offline**, no CLI/model call or installation. `--run` must be explicitly requested; never executed in GitHub Actions or Vercel.
- Run only in an initially clean, disposable `codex/hh-gauntlet-*` worktree of `andylitvinov-design/books`. No `.env*`, `.vercel` or production credentials in that worktree.
- Builder and Critic each run via their own `opencode run` invocation (no `--continue` or shared session). Critic has **no edit/bash/network/MCP rights** and sees the goal, diff and deterministic results, **not Builder self-evaluation**. Both have external-directory access denied. Builder can edit only six named wizard UI/contract test files and has no shell/network/MCP permissions.
- No `git push`, commits, PR merge, Vercel changes, database migration, real posts, paid render or delivery. The script stops on unauthorized edits and on tests/typecheck/lint/critic failures.
- Maximum **2 rounds by default**, upper bound 3; 4-minute default timeout per AI call, upper bound 10 minutes. OpenCode may apply further rate limits. This is a resource bound, **not** a guaranteed dollar-meter; recheck zero-price status before `--run`.

## Reproduce without touching the active checkout

```bash
# On an authorized development machine; obtain CLI from official OpenCode distribution.
cd /path/to/books
git fetch origin codex/public-book-library
git worktree add ../hh-gauntlet-pilot -b codex/hh-gauntlet-pilot-20261027 origin/codex/public-book-library
cd ../hh-gauntlet-pilot
npm ci --include=dev
node scripts/benchmarking/hh-gauntlet-loop.mjs --check

# Only after OpenCode is installed and its account's selected model is visibly free:
opencode models opencode
node scripts/benchmarking/hh-gauntlet-loop.mjs --run --model opencode/glm-5.3-flash-free --rounds 2
```

If either model is unavailable, **stop**. Do not set or enable a paid OpenRouter model, enter a new billing credential, or change the site's providers to make this work. The runner produces a private local `/tmp/hh-gauntlet-scorecard-*/scorecard.json` that labels real provider and CRM delivery `NOT_VERIFIED` regardless of agent confidence. Preserve screenshots/logs only when synthetic and privacy-safe.

## Scoring and stopping

The independent critic returns a machine-validated scorecard for six predefined criteria: `en-ru-es`, `mobile-320-430`, `opt-in`, `single-lead`, `privacy`, `regressions`. Each needs a concrete evidence statement and status `PASS`, `FAIL` or `UNKNOWN`. Missing, duplicated or unsupported criteria cannot pass. The deterministic test/typecheck/lint/whitespace gates **also** must pass. One negative gate stops a PASS; feedback may guide the next bounded builder iteration. On the last failure, exit code 2 and retain evidence. The agents do not approve merges.

The real Chromium/WebKit, mobile and PG17 RLS systems already exist in `.github/workflows/hh-free-express-wizard-v2.yml` and `scripts/verify-free-express-wizard-v2.mjs`. They remain the source of truth for their respective layers. This Gauntlet adds independent AI review and **reuses** those tests; it does not clone them or produce artificial customer leads.

## Acceptance / limitations

- Offline helper unit tests and CI: evaluate exact final-head green result separately.
- OpenCode remote session on connected Mac: **not yet verified**; the available remote desktop connection stopped responding during the bootstrap. Local Git checkout and worktree existence alone do not prove CLI availability.
- Actual free-model agent session/critic JSON, visual screenshots, browser navigation and account-positive CRM/Google/provider E2E: **not yet run** unless later execution evidence is linked.
- Safe production release of tooling files must still confirm current branch, exact GitHub merged SHA, CI result, Vercel `READY` and canonical domain SHA. Workflow deployment is **not** itself a live customer scenario.

Related: [conversion funnel #990](https://github.com/andylitvinov-design/books/issues/990), [CRM #985](https://github.com/andylitvinov-design/books/issues/985), [Free Express rollout #2079](https://github.com/andylitvinov-design/books/pull/2079).
