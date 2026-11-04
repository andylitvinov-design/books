<!-- GLOBAL_PR_ONE_PUBLISH_V1: complete this when OPENING PR; do not edit the body while exact-HEAD CI runs (edited can trigger HH Core). -->
## Root and duplicate preflight

- Verified issue / HH_OPT_ACTION / root: <!-- URL or N/A for independent change -->
- Same-root OPEN or superseding PRs checked on correct target base: <!-- links, or none in verified inventory -->
- Admission decision: <!-- NEW_PR_ALLOWED or INDEPENDENT_SCOPE; if reuse/hold, do not create this PR -->
- Why this is not duplicate work: <!-- evidence, not just title or shared paths -->

## Publication and safety

- [ ] Cohesive source, tests and docs prepared and locally validated BEFORE first remote push
- [ ] One remote HEAD publication, not separate pushes per file
- [ ] Exact target branch, owner lease and latest HEAD independently verified
- [ ] CI/preview triggers and additional cost exposure inspected; uncertain cost => HOLD without pushing
- [ ] Mandatory current-HEAD Core, Specialist, Guard, reviews and branch protection remain required
- [ ] No rewrite of PR body/title during pending CI, and no no-op wake commits
- [ ] Relevant production LIVE independently verified later (N/A for control-plane/docs changes)

Evidence / test receipts: <!-- check name + result, SHA; UNKNOWN for unrun tests -->
Exceptions / verified repair cause: <!-- none or proof -->

See [global standard](https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md), [local canon](../docs/operations/PR_AUTOMATION_CANONICAL_V1.md) and [dedup & one-publish runbook](../docs/operations/PR_REMOTE_ONE_PUBLISH_V1.md#one-root--one-pr-duplicate-admission-before-any-remote-write).
