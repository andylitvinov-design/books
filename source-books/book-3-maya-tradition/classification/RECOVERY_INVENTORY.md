# Maya Tradition recovery inventory

Checked at: `2026-08-26T17:39:50Z`

## Result

No local source export candidate was found. The bounded read-only search covered
`Downloads`, `Documents`, `Desktop`, and `projects` at a maximum depth of five,
using the targeted names `maya`, `mayaismagic`, and `tradition`. Hits in this
repository are planning/manifest material, not a Telegram export or preserved
post corpus; unrelated “tradition” files are excluded.

The public Telegram web view is available without changing an authenticated
session. `curl -L https://t.me/s/mayaismagic` returned current public posts
(`mayaismagic/225` through `mayaismagic/246` in this check). The public
pagination URL [https://t.me/s/mayaismagic?before=225](https://t.me/s/mayaismagic?before=225)
returned the preceding slice (`mayaismagic/205` through `mayaismagic/224`) and
advertised the next older cursor `before=205`.

## Recovery implication

Public pages are usable as a primary author-source retrieval path, provided each
post is preserved with its post URL and ID. They do not establish complete
historical coverage: continue cursor-by-cursor and do not claim an export-level
recovery unless an original local export is supplied.

See `recovery-inventory.json` for machine-readable evidence and scope.
