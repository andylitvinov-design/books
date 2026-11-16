# Master Network — approved mobile mock implementation (7 Nov 2026)
Owner reference: generated mobile Master Network mock in conversation (not committed as product screenshot). Target existing `/{locale}/practice` guest/signed-in dashboard, not protected service editor. Finder remains `/{locale}/masters`.

Visual mapping: new Master Network title/subtitle and existing requests bell above two large cream/emerald modes; existing practitioner heading below; preserve profile/real metrics, six creation actions, photo hero, six offering cards, and tools. Red badge only for real authenticated new request count, never invented screenshot's “3”. Existing iHelp and seven-item dock are global; do not duplicate.

Source: `components/practice-showcase.jsx`, `components/practice-showcase.module.css`, `components/master-mode-switch.*`. Exact routes `/{en,ru,es}/masters` and `/{en,ru,es}/practice`, protected editor unchanged. Mobile 320/354/390/430 and desktop; existing Playwright source acceptance extended to assert real heading and ordering. Previous screenshot landmark measurements need an additive header and switch offset. No new API, DB, auth, payment, subscription, or synthetic user metrics.

Release requires exact HEAD Core + specialist + WebKit/Chromium + Vercel READY exact production SHA and independent iPhone owner QA. Browser/real OAuth E2E cannot be inferred from CI fixture.
