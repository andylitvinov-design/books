# Professional Growth P0 — branch integration contract

This module lives in existing draft PR #2719, NOT production.

- \`proposeProfessionalTemplate\`: 12 translated 4-beat editorial skeletons.
- \`proposeProfessionalCampaign\`: consumes *published public snapshots* only,
  ranks 4 **existing** locally approved MP4 clip references supplied by Video
  Studio, refuses missing/unpublished/foreign sources and reports rights that
  still require individual commercial-use verification.
- It does not call a provider, grant social privileges, create a project, render
  a file, spend XP or publish a post. The output is one editable, unapproved
  30-second 9:16 proposal plus a draft caption and real public CTA.

## Integration dependencies

1. Merge/reconcile source-only Auto Video Director PR #2643 and real catalog
   before adding imports in the shared UI; current production lacks
   \`data/video-catalog/scene-taxonomy.json\`.
2. Public service API must server-serialize only verified published data with:
   \`{id, kind, practitionerId, title, publicDescription, locale, href,
   publicSnapshot:true, published:true}\`. Do not pass raw
   \`app.service_offerings\` or private practitioner account/CRM rows to browser.
3. Inject that read model into the professional card in **existing** Mandala
   editor. On user confirmation, reuse \`applyAutoFilm\` and actual
   \`compileFreeFilmPreset\`; set professional header/end-card overlay and
   off/none personal hypnoaffirmations. Export must pass real media QA.
4. A return of \`catalog_matched_runtime_unverified\` is not permission to
   publish. Browser decode and commercial music/stock rights must be
   independently checked before user-visible production claims.
5. Avoid touching \`components/mandala-free-video-studio.tsx\` on this branch
   while #2643/#2713/#2702 resolve their shared-source dependencies.
6. Add practitioner-scoped My Practice link and owner-RLS negative tests after
   evaluating current auth source and existing Growth Studio roles.
7. Reuse current XP wallet and manual content calendar; paid provider, social
   OAuth, scheduled publishing, and client private profiles are OUT of P0.
