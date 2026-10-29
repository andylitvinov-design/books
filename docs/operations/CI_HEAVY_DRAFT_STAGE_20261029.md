# Heavy browser CI — draft staging (29 October 2026)

## Purpose
On 29 October around 19:57 UTC, GitHub reported **426 queued** workflow runs for `andylitvinov-design/books`. Of the first 100 recently updated open PRs, **60 were Draft**. Browser acceptance on those unfinished changes consumes limited hosted runners, runs again on every commit and delays ready PRs.

## Narrow first-wave implementation
The following four existing heavy browser workflows keep all their previous paths, jobs, timeouts, assertions and production/manual triggers:
- `assessment-range-mobile-browser.yml` — Chromium/WebKit visual test;
- `hh-benchmark-public-browser.yml` — anonymous multilingual browser smoke;
- `hh-home-conversation.yml` — home conversation browser acceptance;
- `site-video-browser.yml` — video browser verification.

Each workflow explicitly handles `opened`, `synchronize`, `reopened`, `ready_for_review` and `converted_to_draft`. Its expensive job uses the same condition:

```yaml
if: ${{ github.event_name != 'pull_request' || github.event.pull_request.draft == false }}
```

- Draft on open/synchronize: expensive job is **skipped**, not treated as a functional test pass.
- Convert Draft to Ready: `ready_for_review` runs the full relevant browser job.
- Any later commit to Ready: `synchronize` reruns the job.
- Convert Ready back to Draft: a new event cancels obsolete in-progress work under existing concurrency where applicable.
- Production `push` and `workflow_dispatch` remain unchanged and execute the full job.
- The PR Sweep Guard workflow retains its short regression tests and validates this policy.

## Mandatory safety
A skipped job is NOT evidence of a tested change. GitHub may show a skipped job as successful; therefore **never use draft-skippable browser jobs as a sole global release gate**. Merge authorization must also require a Ready (non-Draft) PR, exact current HEAD/base, successful applicable *executed* specialist CI and required independent review for security, billing, private user data or migrations. Do not enable native GitHub Auto-merge until a complete enforced specialist aggregate and branch protection exist.

Do not disable browser coverage in Ready PRs, weaken assertions, change runtime application behavior or bypass RLS/auth/privacy checks. This change is not a substitute for existing Fast Lane PR #2526 or the baseline CI repair #2535.

## Measurement and next waves
After merge compare seven-day counts and medians: queued workflows, draft browser runner minutes, Ready CI time, cancellation ratio, repeat CI per head, green-to-merge latency and post-merge regressions. Expand the same policy to other browser workflows only after confirming this first wave produces no missing Ready checks or unsafe skipped release tests. Keep one PR owner and do not re-run unchanged failed checks.
