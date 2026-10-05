# Holistic House GBP Growth v2 — Task Manifest

Canonical source: sales#2 comment 5999363240, revision 2026-10-05.  Baseline source: current canonical Books head `8edbb66` and Production deployment `dpl_CXxHDLrXVjfzGETEymovrVt9LzHp`.

| Task ID | Requirement | Source | Scope | Verification |
| --- | --- | --- | --- | --- |
| GBP-01 | Fresh authenticated GBP baseline and factual low-risk edits | v2 steps 1, 4 | Owner UI | Owner-session readback; no secrets in Git |
| GBP-02 | Address/storefront eligibility, name evidence, category experiment | v2 steps 2, 3, 5 | Owner factual decision | Written owner answer and dated baseline; no change without it |
| GBP-03 | Reviews, QR and eight post publishing package | v2 steps 7, 8 | Repo package; publish only with owner/UI gate | QR decode; link verification; copy review |
| GBP-04 | Real GBP media inventory and missing shot list | v2 step 6 | Repo and public assets only | Asset provenance classification |
| WEB-01 | Local Maps entry journey in the existing public application | v2 steps 9–11 | Included | Unit/route checks and visual QA |
| WEB-02 | Privacy-safe UTM-aware acquisition event contract | v2 step 14 | Included | Unit tests show no answers, scores, names or emails in event payloads |
| WEB-03 | Technical SEO and mobile checks for the changed public routes | v2 step 16 | Included | Build, route headers, metadata and viewport screenshots |
| PSI-01 | Preserve and bridge PsiTrends Toronto pages | v2 step 12 | Blocked: Joomla source/deploy ownership is separate | Existing pages remain 200/canonical; no destructive change |
| MIG-01 | Move GBP website destination to Holistic House | v2 step 13 | Blocked: migration gates not all proven | Explicit gate matrix and rollback retained |
| REP-01 | Durable monthly scorecard and GitHub issue receipt | v2 step 15 and release discipline | Included where no owner data is needed | Versioned scorecard template, issue update after evidence |

## Scope contract

Included now: WEB-01, WEB-02, WEB-03, GBP-03 package, GBP-04 inventory, REP-01 template.  Excluded from automatic mutation: every GBP field, location/address/name/category, reviews, client outreach, media upload, GBP website migration, and PsiTrends deployment.  Those actions require either authenticated owner UI plus factual evidence, or a separate authorized Joomla release. No new auth, Cabinet, test runner, lead database, marketplace, temporary Cloudflare page, medical claim, regulated title, fabricated review, or artificial location asset is in scope.

## Current gates

- `GBP-01`: no owner-authenticated GBP browser/UI binding is available to this task.
- `GBP-02`: factual confirmation is required: “Are clients actually received at 10 Navy Wharf Court during listed hours, with permanent on-site signage?”
- `PSI-01`: PsiTrends source/deploy repository was not supplied as the authorised write target.
- `MIG-01`: Holistic House local path, analytics, Search Console, NAP and measured bridge gates must all pass before a GBP destination change.
