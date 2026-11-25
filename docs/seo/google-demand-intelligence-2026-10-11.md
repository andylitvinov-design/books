# Google Demand Intelligence — collection record

Date collected: 2026-10-11 (America/Toronto). Scope: the editorial clusters in `data/seo-demand-map.json`.

## Verified data boundary

| Source | Status | What may be reported now |
| --- | --- | --- |
| Google Search Console | Connection reported available, but no accessible property, Search Analytics export or URL Inspection response was read | No impressions, clicks, CTR, positions or indexing claim |
| Google Ads Keyword Planner | Not connected | No search volume, competition or CPC |
| Google Trends Explore | No export or chart data retrieved | No interest index, change percentage or related-query claim |
| Google localized SERP | Direct Google queries for Canada (`gl=ca`) in EN/RU/ES could not be read in this environment | No ranking, local-pack, competitor-order or SERP-feature claim |

The map therefore keeps all numeric measurement fields `null`. Editorial keywords are not measurements.

## Required collection matrix

Run each query family in Google Search with the shown locale and location controls, capture the result URL/export, then append the exact collection date and source. Do not fill a missing value with a third-party estimate.

| Market | Language | Query families |
| --- | --- | --- |
| Canada | EN | personal/family constellation, business constellation, drawing assessment, Reiki Yggdrasil, Tantra Reiki, Kundalini Reiki, Temple Studies |
| Ontario | EN | personal/family constellation, business constellation, guided imagery, Reiki training |
| Toronto | EN | family constellation, business constellation, guided imagery, personal consultation |
| Canada | RU | расстановки, бизнес-расстановки, Рейки Иггдрасиль, Тантра Рейки, Кундалини Рейки |
| Ontario/Toronto | RU | расстановки Торонто, бизнес-расстановки Торонто, Рейки Торонто |
| Canada | ES | constelaciones familiares, curso Reiki, Reiki Yggdrasil, Reiki Kundalini |
| Ontario/Toronto | ES | constelaciones Toronto, curso Reiki Toronto |

## Google Trends protocol

For every viable query pair, export the Explore chart for 5 years, 12 months and 90 days. Run `geo=CA` and, where the Trends interface exposes it, Ontario and Toronto. Store the exported CSV or the immutable Explore URL alongside:

- exact query/topic selection and search type;
- interface language and geography;
- collection date/time;
- related Top and Rising queries as displayed;
- the fact that Trends is a relative 0–100 index, not search volume.

## Search Console handoff

1. List properties and select the verified `https://holistichouse.vercel.app/` property only after it is returned by the connection.
2. Export 28- and 90-day query/page aggregates for `/`, `/en/services`, `/en/services/free-situation-review`, `/en/academy/reiki/yggdrasil`, `/en/academy/reiki/kundalini-reiki`, `/en/academy/temple-studies` and their RU/ES alternates.
3. Use URL Inspection for the same canonical paths before saying they are indexed.
4. Join only aggregate query/page metrics to the demand map; never send free-review form answers, drawings, names, emails or client records to analytics.

## Recurring SEO report template

| Window | Property | Sitemap submitted/indexed | Coverage/canonical exceptions | Query/page aggregates | Core Web Vitals | Owner/action |
| --- | --- | --- | --- | --- | --- | --- |
| 28 days | NOT AVAILABLE until property read | NOT AVAILABLE | NOT AVAILABLE | NOT AVAILABLE | NOT AVAILABLE | Connect/read GSC |
| 90 days | NOT AVAILABLE until property read | NOT AVAILABLE | NOT AVAILABLE | NOT AVAILABLE | NOT AVAILABLE | Compare trend window |

Cadence: daily uptime/index-blocking checks, weekly sitemap/canonical/redirect review, monthly GSC and PageSpeed trend review.
