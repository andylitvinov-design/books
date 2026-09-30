# Approved English video jobs

Only newly added `.video-jobs/*.json` files on `codex/bootstrap-books` trigger uploads. Jobs are explicit owner-approved public-content publication commands; private/client content is prohibited. Workflow dispatch alone runs a read-only preflight.

For existing Drive masters, provide `version: 1`, `target: "youtube-en-private"`, `title`, `language: "en"`, `driveFileId`, `driveFolderId` and `sha256`; omit `sourceUrl`. Optional fields: `description`, `tags`, `fileName`. Use IDs and hashes verified in ai-projects-brain #219. No executable example job is included.

For a new approved HeyGen render, provide a current HTTPS `sourceUrl` from a HeyGen media host instead of `driveFileId`, plus `driveFolderId` and the archival `fileName`. Never include passwords or OAuth credentials. Prefer the existing Drive master for retries rather than committing another signed URL.

Uploads remain Private. A new unaudited YouTube API project can lock them to Private; a manual visibility toggle is not a guaranteed solution. A Private upload must never replace the working website embed.

Retries reuse the Drive master and persisted YouTube checkpoint. An ambiguous upload outcome stops for reconciliation rather than blindly retrying. Read `scripts/video-publish/README.md` for activation, audit and recovery gates.
