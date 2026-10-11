# Holistic House — SEO Demand Map (implementation phase 1)

**Status:** Implemented in a PR, not yet live. Reference: [SEO issue #306](https://github.com/andylitvinov-design/books/issues/306).  
**Baseline source:** public `/sitemap.xml` checked 2026-10-11; marketing connections checked 2026-10-11.

## What is now machine-readable

- `data/seo-demand-map.json` — keyword seed → locale → intent → primary URL → next action → later Ads eligibility. All provider metrics are `null`, *not zero*. These are editorial hypotheses, **not Google's verified search volumes or trends**.
- `data/seo-priority-paths.js` — four existing, checked, translated public page families exposed in the sitemap for EN/RU/ES: About, Free Drawing-Based Situation Assessment, Reiki Yggdrasil Basic Course and free Level 1 initiation.
- `tests/seo-priority-paths.test.mjs`, `tests/seo-demand-map.test.mjs` — route, reciprocal hreflang and privacy guards.

The existing sitemap builder is preserved; curated URLs are merged by full URL, no duplicate URLs. **No private client, test results, diagnosis or personal data** are included. The added routes were verified reachable in all three locales on 2026-10-11. This does not prove Google indexing.

## Next implementation passes

1. **Live/source consistency**: public Home/Services sometimes still has older free-conversation copy although the current GitHub source says coaching form + hand drawing + personal written report. Verify the exact deployment SHA against rendered home and services; do not replace newer work with stale snippets.
2. **Money-page quality**: improve existing personal/business constellation service details, accurately describe who the service is for and what the client receives; do not invent credentials or outcomes. Coordinate with open Services PR #228.
3. **Academy-specific metadata**: align `title`/description/H1 for Yggdrasil (7 modules, 5-level Basic), Tantra Reiki (distinct nine-level program), Kundalini Reiki (three levels), Temple Studies. **Open PR #307 modifies Academy catchall; wait for merge/rebase**, avoid concurrent edits to `app/[locale]/academy/[[...slug]]/page.tsx`.
4. **Keyword evidence**: add real Toronto/Canada EN and RU/ES GSC Query/Page, Keyword Planner competition/searches/CPC, Google Trends 12mo/5y comparisons with captured date/geo/source; **no values are currently available** from connected tools. Official Trends normalized index is not monthly search volume.
5. **Future Ads**: map exact/phrase groups to their **own** compatible landings. Do not launch Ads or spend money; block medical/titles/sexual-context claims until reviewed, and block any health-sensitive remarketing. See full campaigns, negative-keyword review and policy gate in issue #306.

## To verify

```sh
node --test tests/seo-priority-paths.test.mjs tests/seo-demand-map.test.mjs
npm run test:unit
npm run build
```

After Preview deploy, validate `/sitemap.xml` and `/robots.txt`, expect 12 curated localized sitemap entries and reciprocal EN/RU/ES links for each (some pre-existing URLs are deduplicated); confirm **no client-specific** URL. GSC URL Inspection and actual organic metrics require connected Google Search Console ownership. This task is **not** a Google Ads release and does not modify the production alias.
