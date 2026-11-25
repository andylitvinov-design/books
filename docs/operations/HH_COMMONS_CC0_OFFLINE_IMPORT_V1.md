# Holistic House · Commons CC0 offline research → Video Vault (operator only)

## Scope and non-goals
- Automatic hourly metadata discovery is research-only; even `CC0` claims are **not** verified licences.
- A private manual `shortlisted_for_rights_review` decision unlocks an **owner-only dossier**, not footage admission.
- This adapter supports only per-file **CC0 1.0** for Wikimedia Commons; public-domain jurisdictional claims and CC BY / CC BY-SA require separate review and are **not** grandfathered into CC0.
- No automatic media download, cloud storage or model inference. No new paid service.

## Owner workflow
1. In `/admin/automations`, visually inspect a source and select **Shortlist for rights review**.
2. Open its research dossier; read source page, claimed author/licence, file dimensions, file format and all mandatory checks.
3. Independently review the Commons file page, credit/license history and any soundtrack/recognizable people/brand/legal restrictions. A Commons machine-readable claim is **not** legal proof.
4. If and only if the exact file is confirmed as CC0 1.0 and commercial/derivative rights are clear, acquire the individual original file through the permitted user workflow. Do not bulk scrape.
5. Record an actual SHA-256 hash of the acquired file (not the source's SHA1 claim). Filename must be a safe, local `.webm` basename for Commons. The `sourceAssetId` uses `commons-<source pageid>` and `sourceProvider` is `wikimedia_commons`.
6. Provide a reviewed `hh-video-vault-batch-v1` manifest containing real, independently verified evidence; see existing `lib/video-vault/contracts.mjs` for owner approval, subject releases, beauty rating, official CC0 license ID/URL and original hash. Never adapt an unreviewed research packet into an import manifest.
7. Run the existing `node scripts/video-vault-ingest.mjs approved-batch.json --target=r2` without `--apply` first. It validates the actual WebM file, FFmpeg decode and exact source SHA-256; dry-run makes **zero uploads**.
8. Only after a fresh verified account-wide R2 usage/billing snapshot, specific owner confirmation and required environment flags, run the existing approved `--apply --usage=/private/usage.json`. The script normalizes H.264 MP4 (24 fps, 5–15 seconds), checks source/original hashes, duplicates, owner rights and R2 readback, then registers media.
9. Verify exact database/physical R2/readback and real Safari playback before counting the footage as generator-ready. Never claim this merely from an upload HTTP 200.

### Restricted Commons licensing policy
- `sourceProvider=wikimedia_commons` maps **only** to `licenseId=cc0_1_0` and `licenseUrl=https://creativecommons.org/publicdomain/zero/1.0/`.
- Direct file page must be the exact `commons.wikimedia.org/wiki/File:<file>.webm` (or supported file variation), with no redirects, credentials, query string or fragments.
- `localFile=.webm` is allowed **only** for this provider; other providers keep existing source file restrictions.
- `sourceHash` (the independently checked local SHA-256) is mandatory for this provider. The Wikimedia API's SHA1 metadata must never be substituted.
- Explicit `exactClipLicenseConfirmed`, `commercialUseApproved`, `editingApproved`, `identifiableSubjectsCleared`, owner artistic approvals and releases remain required.
- If a file needs attribution or ShareAlike, it is **not** CC0 and must be rejected by this importer policy instead of silently relabeled.

## Current release acceptance
The code and owner-only dossier can be released without video file ingestion. A released handler is not proof of a logged-in owner browser interaction. A successful manual rights review is not yet a verified WebM download, MP4, R2 upload, or Video Director-ready asset.
