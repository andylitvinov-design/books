# Approved Holistic House cutover

Owner approval: 2026-09-22. Project API and alias API both verify that
`holistichouse.vercel.app` already belongs to `codex-public-book-library`
(`prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b`, team `super10`). The CLI domain-add
conflict was misleading; no cross-project transfer or deletion is needed.

Both Holistic House and legacy `codex-public-book-library.vercel.app` currently
serve commit `894c548180d5dea40657b2fc3b3f8a6a71473634` from
`andylitvinov-design/books`, production branch `codex/public-book-library`.
Rollback deployment: `dpl_EXmno9tVueGRnVxuBGrBYejrZuQh`, generated URL
`https://codex-public-book-library-7vly1lfe6-super10.vercel.app`.
Keep this deployment and both hostnames intact. To roll back, re-promote it;
do not install reverse redirects because clients may cache forward 308s.

The accepted PR retains all 23 book records, original content, assets, catalog
search/category implementation, and 95 EN/RU remedy pairs. No missing content
was identified against the exact deployed source. Book pages retain their IDs,
query parameters and reading fragments. The root catalog moves to `/books`.

## Route map

- `/`: Holistic House umbrella homepage.
- `/books`, `/books/:bookId`: complete catalog and unchanged individual books.
- `/book`, `/book/:bookId`: permanent compatibility aliases to `/books`.
- `/homeopathy`, `/homeopathy/remedies/:path*`: permanent aliases to existing
  RU pages, matching the existing default PWA locale. Explicit `/en` and `/ru`
  remain unchanged and are paired through canonical/hreflang metadata.
- Legacy public GET/HEAD: 308 to canonical Holistic House, preserving path/query.
- Legacy private client/prescription pages: generic nonce-protected browser
  bridge preserves path/query/fragment. No-store, noindex, no-referrer; fragment
  never enters the server URL. Canonical origin exchanges and scrubs it.
- Admin, API, association files, runtime assets and existing PWA routes retain
  same-origin behavior. No cookies are transferred between hosts. Owner should
  use canonical-origin admin for newly generated private links.

Production storage architecture and credentials remain unchanged; Preview
Redis credentials must never be copied. Set only the separately approved
Production admin PIN. Synthetic release smoke must revoke access afterward;
there is no safe-delete feature, so encrypted inactive audit records remain.
