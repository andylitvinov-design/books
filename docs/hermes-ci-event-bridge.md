# Hermes CI event bridge from Books

The existing `HH PR direct failed-Core handoff` workflow now includes an event
sender to the Hermes Task Service receiver:

`POST /webhooks/github/workflow-run`

It revalidates the single event PR association against the live PR. When
GitHub emits an empty `pull_requests` array, it recovers the association only
from one open PR matching both the exact branch and exact workflow-run HEAD.
Ambiguous, stale and moved associations fail closed. It retrieves failed job
and step names from the original workflow run and sends only bounded
diagnostics, never logs or source contents.

## Required repository Actions secrets

In `andylitvinov-design/books` → Settings → Secrets and variables → Actions,
add:

- `HERMES_ORIGIN_URL`: HTTPS origin only, e.g. `https://hermes.example.com`.
  Do not include a path, query, or trailing endpoint.
- `HERMES_SHARED_SECRET`: the same secret configured as
  `HERMES_SHARED_SECRET` on the already-deployed Hermes Node service.

Do not put either value in an issue, PR, commit, workflow YAML, or chat.

Until BOTH secrets are present, the sender reports
`BRIDGE_DISABLED_MISSING_SECRET_OR_ORIGIN` and sends nothing. Once present,
a successful receiver response is recorded as `RECORDED` or a precise
non-recorded outcome. A failed network/HTTP receipt is visible in the workflow
summary and the run will not falsely report a successful bridge.

This enables CI-to-Hermes evidence delivery only. It does not start Codex,
enable paid AI, authorize GitHub source writes, merge, or deploy. The sender
becomes LIVE only after both existing production settings are provisioned and
a real event appears in the matching Hermes task.
