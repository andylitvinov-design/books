# Branch delivery contract — Holistic House (2026-11-02)

## Two intentional targets

- GitHub **default** `codex/bootstrap-books` is the trusted **control plane**: Control Tower, repair workers, workflow_run observers, PR release metrics and automation policy. A control-only PR merged here is **not** a failed website deployment. Confirm its effect with the required GitHub workflow on the new trusted commit.
- Vercel production source `codex/public-book-library` is the **site/runtime plane** for `holistichouse.vercel.app`. Product, public UI, runtime, and production-scope CI fixes are merged here through the existing protected `hh-merge-check` and applicable specialist/browser checks. Do not demand that these changes be merged to GitHub's default branch as proof of delivery.
- Stacked PRs may target their parent feature branch; a merge there is **not** production delivery until the change reaches its intended protected target by a checked, separate merge.

## Status meanings

| State | Required evidence | Do not infer |
| --- | --- | --- |
| CONTROL_MERGED_RUNTIME_NOT_APPLICABLE | Merged PR, base `codex/bootstrap-books` | Vercel deployment, or that the next workflow already ran |
| PRODUCTION_MERGED_LIVE_UNVERIFIED | Merged PR, base `codex/public-book-library` | That the public alias serves the commit, or failure if Vercel ignored a CI-only build |
| PRODUCTION_LIVE_VERIFIED | Exact served Vercel production deployment, canonical public alias response, validated ancestry of merged production SHA | That it remains the newest deployed revision forever |
| Other/stacked base | Merge into a different branch | Delivery to either protected target |

`scripts/ci-pr-release-outcomes.cjs` reports **separate** 24-hour production and control merge cohorts. The legacy `merged_count` is production-base only. `live_confirmed_count` stays null if actual served evidence is unavailable, never a guessed 0. `HH_LIVE_VERIFIED_V1` receipts remain restricted to exact, protected production PR merge commits.

## Routing / verification procedure

1. Before enabling a merge, inspect PR `base.ref` and changed paths. Use the correct branch for the change; keep the existing protected merge gates. Never retarget or fast-forward thousands of divergent commits just to make two branches equal.
2. After a production PR merges, independently inspect the **active** Vercel alias deployment and its GitHub commit ancestry. A canceled or skipped CI-only Vercel build is not LIVE evidence and does not invalidate a previously served site revision.
3. After a control PR merges, validate the trusted default-branch workflow at that SHA. A change to **shared** workflow files might need a separate, scope-specific PR to the other branch; confirm the relevant file behavior there instead of assuming two divergent histories synchronize automatically.
4. For an explicit staged/stacked PR, follow the chain to the protected destination and only then count that destination's merge. Do not record premature LIVE receipts.
5. Never replace a real specialist, browser, security or `hh-merge-check` check with a report-only success indicator.

Examples from November 2: #3099 belongs to control; #3105 belongs to the production CI plane even though its Vercel build can be intentionally skipped; #3096 reached the public Vercel alias on the checked revision.
