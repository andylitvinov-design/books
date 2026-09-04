# Phase 4 — integration proof and PR

SUPERGOAL_PHASE_START

## Work

Run the full verification suite and build, inspect static output counts and existing book route preservation, deploy an isolated Vercel preview, validate the preview’s public routes, push the integration branch, and open a PR against `codex/public-book-library`.

## Acceptance criteria

- Production is not deployed or modified.
- Preview proves representative RU/EN route, search UI, 404, sitemap, and restored book route.
- PR targets the canonical base branch.

## Verify

`npm run test:unit && npm run lint && npm run build`

## Mandatory commands

- `npm run validate:remedy-inventory`
- `npm run validate:remedy-content`
- `npm run test:unit`
- `npm run lint`
- `npm run build`

## Evidence required

- Vercel preview URL and HTTP results for public localized and existing book routes.
- PR URL with base `codex/public-book-library`.
- Git log and deploy command showing no production promotion.
