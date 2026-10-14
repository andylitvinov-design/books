# Preserved rejected GA4 experiment (ec432777)

The files ending in `.source` are byte-identical copies of the previous transport, tests and workflow at commit `ec432777aa9e67b62f2b372600f7f19a63e4c182`. They are reference material, not executable production files or passing acceptance tests. The complete old tree remains available through that immutable commit and normal PR history; this is not a force reset.

That experiment confirmed an intercepted private-path leak through Google `/td` diagnostics. Its negative assertions were not relaxed. Running its active-transport test directly against the newer intentional no-SDK safety implementation is no longer the same experiment. The old active-only workflow and unit test are therefore preserved here while the production files come unchanged from canonical `1739b433c6300d051f9f0d4900efef266582791a`.

The sibling 2026-10-12 transport/root-plan documents describe that historical rejected proposal and its release blockers. Current runtime analytics remains unavailable (`PUBLIC_ANALYTICS_AVAILABLE = false`), exactly as published by PR392. The new isolated rewrite-root CI tests a small structural hypothesis; passing it cannot authorize production activation or certify full application routing, actual BFCache restoration, engagement attribution, or complete raw-CDP wire-header coverage.

To reproduce the rejected experiment, use the complete exact ec432777 tree in an isolated environment with its original pre-send request interception and dead proxy. Do not run its SDK against live Google, real users or client data. Source archive Git blob hashes are recorded in `manifest.json`.
