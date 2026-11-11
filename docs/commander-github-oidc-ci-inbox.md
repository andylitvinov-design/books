# Agent Commander GitHub CI event inbox

The existing failed-Core workflow sends a short-lived GitHub Actions OIDC token
to the already deployed Supabase Edge Function. No webhook secret or new
runtime host is required.

The receiver accepts only:
- issuer `https://token.actions.githubusercontent.com`;
- audience `hh-commander-ci`;
- repository `andylitvinov-design/books`;
- workflow ref `andylitvinov-design/books/.github/workflows/hh-pr-direct-core-failure.yml@refs/heads/codex/bootstrap-books`;
- event name `workflow_run` and the trusted control branch.

It verifies the JWT signature against GitHub's published JWKS, then validates
the failed Core workflow metadata and one exact PR association. It persists a
deduplicated event in the owner-only `business_brain.commander_ci_event_inbox`
table and appends a verified `github_report` event only when exactly one
existing Commander task and exactly one task chat match the PR. Unmatched and
ambiguous events stay in the inbox; they do not get assigned to a random task.

The event receipt proves CI failure intake only. It does not prove that an
executor started, that source was changed, or that the failure was repaired.
It never grants GitHub write, starts Codex, retries CI, merges or deploys.

The Edge Function's normal user-facing paths continue to perform their own
Supabase Auth user lookup and owner_access check. Only the dedicated webhook
path accepts a GitHub OIDC identity.
