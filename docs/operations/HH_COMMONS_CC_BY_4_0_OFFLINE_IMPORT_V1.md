# Commons CC BY 4.0 — owner-reviewed offline source pathway

AI Council 2.1 / Video Vault. This is **not automatic rights approval or online media ingestion**.

## Why
The hourly research index contains some candidates claiming `CC BY 4.0`. CC0-only admission could not accept them. This change introduces a **separate exact-file provider policy** `wikimedia_ccby`, not a blanket Commons license or a replacement for `wikimedia_commons` CC0.

## Exact owner-only import
1. Shortlist the candidate, open the private rights research dossier, inspect its original Commons `File:` page (license history, true author, additional audio/people/logo rights, commercial/derivative rights).
2. If the *individual* file is confirmed CC BY 4.0, obtain the source WebM manually, keep it **local** and calculate the actual SHA-256. Use `sourceProvider=wikimedia_ccby`, `licenseId=cc_by_4_0`, `licenseUrl=https://creativecommons.org/licenses/by/4.0/`, `sourceAssetId=commons-<pageid>`.
3. Supply **visible `attributionText`** with exact credited author, source file page, CC BY 4.0 and adaptation indication; retain the license link and evidence in the review manifest. No implied endorsement. Confirm whether attribution actually reaches the user in each final product: if not, HOLD distribution.
4. Record the real local SHA-256, original aspect/quality, clip frame/audio/subject inspection and owner visual approval. Continue to use the existing `scripts/video-vault-ingest.mjs` dry run first.
5. To apply, require owner upload authorization plus fresh account-wide R2 billing/usage approval, local ffprobe + ffmpeg normalized H.264 MP4, duplicate and SHA256 checks, private R2 readback, and original Video Vault permission gates.

**Not permitted:** CC BY-SA (requires derivative share-alike review), CC BY-NC, CC BY-ND, public-domain metadata claims without jurisdiction verification, remote automatic downloading, automatically declaring video generator-eligible, or adding paid infrastructure.

## Credits/reference
- CC BY 4.0: https://creativecommons.org/licenses/by/4.0/
- Wikimedia file-by-file reuse guidance: https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia

No new CRON, payment, secret, provider API, migration or CI workflow. Operator action and individual rights review remain a hard blocker to physical MP4 publication.
