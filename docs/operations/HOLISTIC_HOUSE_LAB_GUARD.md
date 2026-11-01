# Holistic House Lab — installation status

This isolated branch is NOT production and must not be merged or deployed to production without review.

Lab Vercel project: prj_bjwATbHF61gzEhfsrNe54lEnvJZw, team team_OSf690d0nxRHWVMXCElA8i95.

Lab is protected by Vercel Authentication. The GitHub production branch is codex/public-book-library. Do not connect Lab to the production domain or reuse production Supabase, payment, CRM, email, messaging or webhook credentials.

Deployment requires a verified isolated test database, side-effect deny-by-default implementation, a real billing source and central cross-agent scheduler. The environment variables HH_LAB_ISOLATED_SERVICES and HH_LAB_COST_APPROVED are assertions, not enforcement.

Budget target: $20/month total Vercel subscription; not a guarantee. 12 attempts/rolling 24h and 30-minute interval are initial rate-limit policy. Only deploy with a verified preview target, never promote to production.

The source script lives at scripts/lab-deploy.mjs and must remain fail-closed until isolation, budget and multi-agent lock are verified. No PR is opened by this installation.
