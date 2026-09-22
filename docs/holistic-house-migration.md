# Holistic House: Preview review and release gates

Approved scope: Holistic House umbrella identity and a reviewable Preview in the
existing `codex-public-book-library` project. PsiAlchemy remains the library/app
product. Historical titles, source content, prescriptions and storage are preserved.

## This branch

- `/` introduces Holistic House and its planned directions. Only existing material
  receives working section links; no invented service descriptions or empty SEO pages.
- `/books` contains the existing catalogue; `/books/[bookId]` is unchanged.
- Versioned `canonicalSiteUrl` is `https://holistichouse.vercel.app`, including
  sitemap, hreflang and new generated public links inside PDFs. The previous
  `NEXT_PUBLIC_SITE_URL`/`PSIALCHEMY_CANONICAL_HOST` settings are no longer read by
  this helper, so build-time and runtime origin cannot disagree. No env edits needed.
- Preview canonical URLs describe the proposed release; the hostname is not yet
  attached. Preview protection/noindex must remain in force.
- Public 308 policy is implemented but disabled. It recognizes only the old
  production hostname, preserves paths/query, and cannot redirect Preview hosts.
- Private pages, admin, APIs, PDFs, service worker/assets and association endpoints
  retain their origin. A blanket redirect would strand host-only authenticated
  sessions and could break same-origin POST checks.
- PWA name/start URL and native PsiAlchemy app identifiers remain unchanged.

## After separate production approval

1. Recheck target ownership and current project/deployment. Attach only
   `holistichouse.vercel.app` to project `prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b`.
   If unavailable or assigned elsewhere, stop: do not force transfer or create a project.
2. Verify HTTPS and project assignment, then enable `canonicalRedirectEnabled` in
   an isolated release change. Preserve the old domain indefinitely for private URLs.
3. Verify public paths, query strings, RU/EN canonical/hreflang, sitemap and robots.
   Start with temporary redirects during cutover validation if instant rollback is
   required; cached permanent redirects cannot be recalled from users' browsers.
4. Native release is a separate artifact: add the new host to Capacitor navigation,
   JS allowlists, iOS entitlements and Android filters together; retain old-host and
   `psialchemy:` support and `app.psialchemy.mobile`. Do not point installed native
   shells at an unattached host. Preserve empty association documents until real
   signing IDs/fingerprints and device verification are available.
5. Newly issued client links use the admin browser's origin. Move admin operations
   to the new host after cutover; existing client links keep working on the old host.
   Do not migrate cookies or rotate access credentials merely for a host change.
   Test both hosts with isolated synthetic data only, under separately authorized
   storage access. No production records were used for this Preview review.
6. Verify public PDF downloads and generated recommendation/receipt links. Preserve
   signatures, historical PDF content, payment values and existing source URLs.

## Rollback

Record the production deployment immediately before release (audit baseline:
`dpl_EXmno9tVueGRnVxuBGrBYejrZuQh`, commit `894c548180d5dea40657b2fc3b3f8a6a71473634`).
Re-promote the recorded deployment, keep both aliases attached to a working version,
and disable forward redirects. Never install a reverse redirect while clients may
cache old-to-new 308s. Recheck old/new public and private routes. No storage migration
or env rollback is required by this branch.

## Verification

Run the unit suite, lint and production build; inspect desktop/mobile Preview,
catalogue search, original book pages, localized remedies, sitemap, robots and
manifest. Verify private-route headers without loading real client records.
Confirm production deployment ID and domain list are unchanged after Preview deploy.
