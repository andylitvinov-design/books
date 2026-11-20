# Holistic House — SEOmator technical audit integration (2026-11-20)

## Goal

Extend the **existing** owner-only `/admin/seo` (not a second analytics platform).
Preserve current GSC search clicks/impressions/CTR/queries, dated sitemap/indexing
snapshots, Lighthouse and the ranked native recommendations. Link directly to
`/admin/acquisition` for real *first-party anonymous* page views, entrances,
clicks and traffic sources. None of those are unique visitors or paid orders.

## Architecture / spend

- Open-source MIT package: [seo-skills/seo-audit-skill](https://github.com/seo-skills/seo-audit-skill)
  (`@seomator/seo-audit@8.0.1`, **pinned**).
- Only the GitHub-hosted **scheduled/manual Action** installs SEOmator and crawls
  the *published public domain*; Next/Vercel never installs the package, native
  sqlite, Playwright or browser binaries. No SEO API charges or Vercel cron.
- A single weekly job (24 pages maximum, concurrency 2, 15-second request timeout,
  300ms delay, respecting robots) uses `scripts/seomator-public.toml` to
  exclude admin, private clients, results and APIs. Existing 601-URL sitemap audit
  remains the source for full URL status coverage.
- The Action converts verified CLI JSON into `seo-audit.json` using
  `scripts/build-seomator-snapshot.mjs` and retains **12 dated scores**.
  Only the bounded summary (no raw page contents, tokens, emails or client links)
  is published as a **public GitHub Release asset**, tag `hh-seomator-history`.
  The detailed original run is available only in a GitHub Actions artifact.
- The owner-only dashboard reads that immutable-origin release URL at most hourly,
  validates domain, schema, date, numeric score, category identifiers and run URL,
  and shows **missing / unavailable / stale** rather than invented results.
  Audit results older than 14 days are labelled archived.
- This does **not** auto-change SEO metadata, publish content or call LLM APIs.
  All report numbers are technical sample values, never Google rankings, GA4 visits,
  lead receipts or measured conversions.
- Public GitHub Actions on standard runners are generally free within GitHub's
  published allowance; no new third-party subscriptions are required. The workflow
  must not create commits/branches in the production website and is therefore not
  intended to trigger extra Vercel builds.
- Google GSC data still requires the site's own read-only service account in Vercel
  (`HH_GSC_SERVICE_ACCOUNT_EMAIL` and `HH_GSC_SERVICE_ACCOUNT_PRIVATE_KEY`,
  managed outside GitHub). The optional ChatGPT GSC Wizard subscription is *not*
  a prerequisite, and is not used by the scheduled job.

## Release sequence

1. Merge the **site PR** into production branch `codex/public-book-library`
   after existing protected CI and mobile QA. Verify the exact production deploy SHA.
2. Merge the **workflow PR** into GitHub default branch `codex/bootstrap-books`.
   GitHub cron and `workflow_dispatch` only run workflows present on the default branch.
   The Action checks out the production branch for the parser and crawl config, so
   it cannot accidentally audit stale bootstrap source.
3. In repository **Actions → Holistic House SEOmator weekly audit → Run workflow**,
   run once (or let the Monday schedule do it). Verify a successful Action with
   `artifacts/seomator-raw.json`, `artifacts/seo-audit.json` and the Release asset
   `hh-seomator-history/seo-audit.json`.
4. Sign into `/admin/seo`, check the dated score, categories, findings and trend;
   the separate `/admin/acquisition` link opens visits and sources. On subsequent
   weeks inspect score differences *alongside* crawl coverage before declaring a
   regression. If the Action failed, the prior result stays date-labelled.
5. Once operational, extend the rule pipeline to map broken `hreflang` reciprocal
   links, canonical and structured-data evidence to existing SEO issues / fixes,
   subject to human review. Do **not** auto-merge metadata changes from an audit.

## Acceptance / privacy

- Signed out cannot view the report in admin; release exposes only **public-site
  technical score and category names** (never private analytics or user data).
- All GSC, first-party traffic and crawler measurements have distinct sources and
  dates. Search impressions are not visitor counts.
- 404 first run shows an empty state; network failure shows unavailable; invalid or
  future-dated file is rejected; >14 days is labelled stale.
- CLI exit 1 (score threshold finding) is not a transport failure, exit 2 is;
  no production CI hard fail on SEO scores until a reviewed baseline exists.
- The 24-page sample must not be described as the full 601-URL crawl.
- Run `node --test tests/admin-seomator-audit.test.mjs tests/admin-seo-dashboard.test.mjs tests/admin-seo-recommendations.test.mjs`,
  plus exact-HEAD required CI/build before production merge.
