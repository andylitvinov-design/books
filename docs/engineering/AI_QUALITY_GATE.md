# Holistic House AI Quality Gate

Target production branch: `codex/public-book-library` (not repository default).

## Before PR
- Read relevant issue, latest comments, existing implementation and migrations; avoid duplicate functionality.
- Run relevant tests, typecheck, lint and build on exact head. Record commands and results; never call an unrun check green.
- Independent reviewer examines diff and test coverage. Verify each finding before making changes; limit automated review/fix loops to three, then escalate.
- No secrets, sensitive health details, test answers or client data in logs or external notifications.

## Risk classification and approvals
- LOW: isolated copy, visual or documentation change, no security/data/financial impact. Eligible for automated merge only with complete green required CI, independent review, correct base, no unresolved blockers, and rollback path.
- MEDIUM: product logic, forms, APIs, analytics, external messages, or non-destructive DB changes. Require one independent human approval and relevant integration/E2E evidence.
- HIGH: authentication, RLS, private data, payments, destructive migrations, secrets, CI permissions, or bulk outreach. Require two independent human approvals and explicit release plan. No automatic merge.
- Unknown risk = HIGH. AI agents do not count as independent human approvals.

## Review and release
- Separate bug-hunting review from independent finding validation; reject unsubstantiated findings.
- Verify PR head SHA, target branch, CI checks, migration safety, permissions, EN/RU/ES, 320–430px mobile, errors and accessibility.
- Feature-flag risky changes off by default. Do not enable until prerequisites and authenticated E2E pass.
- Merge != production. Verify Vercel READY deployment, exact deployed SHA, alias `holistichouse.vercel.app`, and real page → API → database → CRM → message → cabinet → action where relevant.
- Payments require provider-confirmed success; messaging requires provider-confirmed delivery. Never use clicks or mock success as proof.
- For failed or unverified deployment, report blocker, rollback route and exact issue/PR. Do not claim LIVE.

## Incident-driven regression
For each confirmed incident, add a minimal reproducible regression test and document the failure signature. Include historic build failures, empty/jobless CI workflows, double submission, missing client messages, private-media access, RLS violations and stale deployment SHA. Review regressions daily without disabling failing checks.

## PR report contract
Risk / reviewer evidence / exact head SHA / tests and CI URLs / merge SHA / Vercel READY SHA and URL / E2E evidence / unresolved blockers / owner actions.
