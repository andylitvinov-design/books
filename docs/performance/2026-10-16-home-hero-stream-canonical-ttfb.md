# Holistic House homepage: performance + SEO + consultation first screen — 2026-10-16

## Shipped in PR #731 (pending verified merge at this document revision)
- EN/RU hero video slot now receives a server-streamed Suspense child. The first response no longer waits for published-video Redis; the existing 60-second published-only data cache remains tagged for invalidation. No drafts, private records, session cookies or CSP nonces are shared across visitors.
- EN/RU/ES visible headlines align with free-self-check / personal guidance metadata. Paid consultation is the first, burgundy, mobile-visible CTA, while free written situation review remains a separate action. Paid choices link to the real /LANG/services#consultation selector. Spanish Services has the same confirmed selector.
- Native hashed pre-generated Andy portrait variants have a one-year immutable cache header. No broad cache rule affects HTML, RSC, APIs or the Client Cabinet.
- Live TTFB measurement uses canonical / and /ru instead of obsolete redirecting /?lang=ru and insists on HTTP 200. Streaming improves initial response blocking but does not assert a numeric LCP/TTFB target.
- Homepage HTML stays dynamic because the shared layout emits per-request nonce-bearing CSP and locale. A full-page ISR switch without first redesigning CSP/hydration is unsafe; do not set force-static or cache private HTML.
- No new videos, YouTube publications, payments, credentials or private data changes.

## Verify
Run repo unit, lint, TypeScript, Next build, EN/RU/ES browser and video playback suites. On merge verify exact Git SHA matches canonical Vercel READY deployment, and the public hero CTA is visible and targets the real selector. Measure first and warm canonical TTFB; inspect browser LCP independently. Report Vercel Image Optimization counters only from authorized billing UI since the connected billing endpoint returns 404.
