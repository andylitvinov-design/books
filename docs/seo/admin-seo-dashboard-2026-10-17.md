# Holistic House — Admin SEO Analytics

Route: **`https://holistichouse.vercel.app/admin/seo`**. This dashboard is for the existing practitioner/admin session and is never public/indexable. Login at `/admin/login` using the existing practitioner access code, then open **SEO** in the header or the SEO Analytics card in `/admin`.

## Information architecture

- Four organic-search KPIs: **clicks, impressions, CTR and average position**, optional 7/28/90-day filter. CTR and ranking are **undefined**, not 0, until impressions exist.
- Daily search trend plus top queries/pages from Google Search Console only when the secure API integration is enabled and authorized.
- Live public sitemap URL count (15-minute Next cache) and a clearly dated **Google Search Console sitemap** report.
- Dated 19-page URL Inspection Tracker (indexed/pending/not indexed).
- Last verified full technical crawl: HTTP 200, redirects and errors.
- Latest recorded Lighthouse mobile and desktop performance, lab LCP, CLS and SEO.
- Links to GSC, sitemap, historical verification report, SEO issue #306 and Lighthouse artifacts; export of visible measurements to admin-only CSV.
- The GA4 section clearly states that **visitor, referral, lead and conversion** metrics are unavailable until real GA4 access is configured.

## Data provenance and refresh guarantees

The initial snapshot in `data/seo/verified-baseline-2026-10-17.json` was read from verified GSC Wizard, GSC sitemap, GitHub Actions and Lighthouse. It is **not automatically refreshed by Google**, and the UI always shows the dated source. The 28-day snapshot is shown only for the 28-day filter. For 7/90 days the dashboard shows unavailable fields, not copied 28-day figures.

As of the 2026-10-17 snapshot:
- Search Console through **2026-10-14**: 0 clicks, 0 impressions, CTR and average position not meaningful.
- Official GSC sitemap downloaded 2026-10-16: 601 submitted, 0 indexed in sitemap report, 0 warnings/errors.
- Independent GSC Wizard URL Inspection Tracker checked 2026-10-17: **1 indexed of 19 tracked** (a *different count and date* than the sitemap report).
- The published sitemap had **601 URLs**; the full audit returned **601 HTTP 200** with no redirects or errors.
- Last saved Lighthouse: mobile **82/100**, LCP **3.23 s**; desktop **100/100**. These are **lab data, not field CrUX**, and may be superseded.

The sitemap URL count is refreshed from the live public sitemap on the server, never from browsers or private client data.

## Automatic Google Search Console API integration (optional)

The already connected **GSC Wizard ChatGPT plugin is not the deployed website's credential**. A ChatGPT plugin connection cannot be silently reused by Next.js in Vercel. To enable the dashboard's live search metrics, configure a dedicated Google service account with least privilege:

1. In the owner's Google Cloud project, enable the **Google Search Console API**, create a service account with a private key, and add the service account email to the verified property `https://holistichouse.vercel.app/` in Google Search Console **Settings → Users and permissions** (restricted/read-only access is sufficient).
2. In the **existing** Vercel project, set server-only environment variables `HH_GSC_SERVICE_ACCOUNT_EMAIL` and `HH_GSC_SERVICE_ACCOUNT_PRIVATE_KEY`. Use the full PEM key (either literal newlines or escaped `\n`); enter it directly in Vercel, **never** in ChatGPT, GitHub, client code or this dashboard. Trigger redeploy if necessary.
3. After deployment, visit `/admin/seo`. It should show **Live Google data** and dated 7/28/90-day search results when access is successful. Missing permissions or API failure yield an explicit *connection unavailable* indication, with no fabricated numbers.

Implementation uses Google OAuth's short-lived service-account JWT assertion, the read-only scope `webmasters.readonly`, HTTPS endpoint allowlists and server memory token caching. Tokens are never emitted to the browser or included in the CSV. Dashboard and CSV both call `requireAdminRequest`; responses are private, uncached and noindexed.

## Acceptance checklist

1. Signed-out `/admin/seo` redirects to `/admin/login`; unauthorized `/admin/seo/export` returns 401.
2. Signed-in admin accesses dashboard from cabinet home and top navigation, EN/RU labels and iPhone layout.
3. GSC snapshot correctly shows 0 clicks/impressions for 28 days, **1/19 indexed** in tracker, **0/601** from the older sitemap report, source dates and notes.
4. Filter 7/90 days without configured GSC must show unavailable, not the wrong 28-day figures.
5. Sitemap count refreshes; CSV opens only for admin and escapes spreadsheet formula injection.
6. Dedicated tests + TypeScript + Next production build green; actual Vercel alias points at the merged commit before reporting LIVE.

No Google account grants or permissions are assumed; automatic GSC refresh is **pending external Google service-account setup**. This does not block the verified historical SEO dashboard.


## Metric-aware recommendations — 2026-10-17

The protected admin SEO page now shows *Recommendations and priorities* beneath the search KPIs. RU/EN cards are sorted P0 urgent, P1 important, P2 planned, and OK healthy. Every card gives its triggering metric, understandable interpretation, concrete steps, a trusted link, source, and date. First three cards are immediately visible, with the rest in a responsive expandable section.

Pure, offline rule engine: lib/seo/actionable-recommendations.mjs. It uses the exact search period currently selected (7/28/90 days), the saved source-labelled Google indexing tracker, the live sitemap check and the recorded Lighthouse lab metrics.

- HTTP errors or sitemap redirects in a verified crawl → P0 investigation; all 601/601 returning 200 → healthy result instead.
- Live sitemap URL count differs from the *dated* Google sitemap report → reconcile, never assume both were fetched simultaneously.
- Missing GSC API → set up read-only access; missing search data is not interpreted as zero. A verified 28-day snapshot is never reused for 7/90 days.
- Zero organic impressions → inspect priority page indexing, content and internal links, *not* claim technical SEO failure. A new site may not yet have been crawled/indexed.
- Fewer than 100 search impressions → insufficient sample for decisive CTR advice. At least 100 impressions plus CTR below 2% with position 15 or better → review snippet relevance. At position worse than 20 → strengthen helpful content before attempting wholesale title changes. These are editorial triggers, **not universal CTR guarantees**.
- Low indexed share in the 19-page tracker → inspect specific pages; a recent tracker snapshot (<14 days old) is a watch recommendation, not a failure. Tracker data are not the sitemap Google indexed count.
- Mobile Lighthouse below 90 or saved lab LCP above 2,500ms → rerun on the current production commit and optimize measurable bottlenecks. Do not present outdated Lighthouse results as real-user CrUX data.
- Unverified GA4 → suggest privacy-respecting aggregate inquiry measurement, never transmit client answers or health data.
- Search data more than 30 days old → request a fresh report before making decisions based on old values.

Guidance is read-only: no automatic website edits, indexing requests, paid advertising, AI credits or secret transfers. The dedicated CI tests include no-data, CTR sample boundaries, technical severity, indexing age, bilingual explanations, safe links and responsive disclosure. Production release still needs exact Vercel SHA verification.
