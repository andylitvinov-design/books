# Technical SEO audit — 11 October 2026

Scope: the public Holistic House routes changed or protected by Issue #306 / PR #309. This is a source-and-test audit; it does not turn an inaccessible protected preview into live evidence.

| Area | Evidence | Result / action |
| --- | --- | --- |
| Sitemap | `getPrioritySitemapEntries()` produces 4 page families x EN/RU/ES = 12 unique canonical HTTPS URLs; `app/sitemap.ts` merges and URL-deduplicates them | Guarded by `npm run verify:seo` |
| Canonical and hreflang | About, free written-review and Academy routes declare canonical paths and EN/RU/ES alternates; About now also points to the existing `/es/about` page | Source-tested; Preview readback still required |
| Index safety | Cabinet, client selector, report and admin-client routes each declare `robots: { index: false, follow: false }`; the priority sitemap and demand map reject private-path segments | Guarded by `npm run verify:seo` |
| Titles, descriptions and H1 | The verifier requires metadata/alternates for public priority routes and H1 sources for About, free review and Yggdrasil Level 1. Academy has route-specific metadata for Yggdrasil, Tantra Reiki, Kundalini Reiki and Temple Studies | Source-tested |
| Structured data | Added a minimal `WebSite` JSON-LD entity with only name, canonical URL and supported languages | No medical or practitioner credential schema was added because it would need independently verifiable data |
| Internal links | The free Yggdrasil initiation links to Level 1 practice, its Basic Course book and course overview. Tantra has course navigation and enquiry anchors; Academy records link to Library and Services | Retain these links when editing source pages |
| Speed / runtime | Local production build and browser reproduction were not completed: the workspace filesystem returned `ENOSPC`. Protected Preview could not be authenticated because Vercel CLI could not create its sandbox-blocked local auth file. | Do not claim Core Web Vitals, build or protected Preview success. Re-run after capacity/auth remediation. |

## Commands for future PRs

```sh
npm run verify:seo
npm run verify:seo -- --live-base=https://holistichouse.vercel.app
```

The live command checks the sitemap, alternate links, robots response and public route availability. For a protected preview, run it only from an already authenticated Vercel CLI session; do not disable Deployment Protection.
