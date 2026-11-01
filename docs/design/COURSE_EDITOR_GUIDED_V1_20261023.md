# Guided course creation · Holistic House · 2026-10-23

**Scope:** UX-only improvement to the existing authorized multi-practitioner editor from books #1484 and PR #1487. Production target: `codex/public-book-library`, NOT the default branch. Do not create a second course model, duplicate the Reiki owner lesson tools or change Supabase RLS/storage.

## Starting journey (EN / RU / ES)

1. My Practice → Materials → Courses → **Create or edit course** opens the existing builder. On a fresh account the short **name + language** form appears automatically. No empty course is stored until Create is clicked.
2. **Create course and first slide** creates a private server-backed draft with the chosen name and one editable text screen. The master writes one idea, optionally chooses photo/audio/video/link, duplicates/moves slides and selects the next screen within the same workspace.
3. **Save draft** preserves the currently selected slide and uses the existing optimistic revision check. Mobile keeps saved courses under a single optional **My courses** switch instead of pushing the editor below a long list. Explicit unsaved-changes confirmation remains when changing courses.
4. The private in-place preview shows one slide's text/media without autoplay. Missing slide text or unverified media gives a clear local blocking explanation. **Publish** still asks for explicit confirmation and requires existing server authorization/content rights; only the published snapshot and public permalink are shareable.

## Design details

- The single-screen workbench and global PWA navigation remain unchanged. EN/RU/ES copy, cream/wood palette, teal CTA, >=44px hit targets, 320–430px breakpoint. Optional description/language editing and archive are collapsed to reduce default visual load.
- Existing upload-intent → Supabase signed upload → verified asset completion, private media reads, owner bindings and revision-safe save are untouched. 60-screen and file-size limits remain unchanged.
- This UX patch does **not** introduce autosave that might silently overwrite a second editor tab; successful save and explicit publish remain distinct.
- Other existing Reiki Practitioner, My Courses, anti-stress and Business programs are not migrated; they keep their current separate implementation until a reviewed content migration is explicitly approved.

## Verification required before calling LIVE / E2E

- [ ] Node contract suites: `node --test tests/practitioner-course-builder.test.mjs tests/practice-course-materials-navigation.test.mjs tests/practitioner-course-quick-start.test.mjs`.
- [ ] Scoped ESLint, typecheck, Next build / GitHub CI on the exact PR head.
- [ ] Vercel READY build at merged source SHA and `holistichouse.vercel.app` alias readback.
- [ ] Real authenticated master: create EN/RU/ES course → first screen → edit → upload verified private media → save/reload retaining active screen → duplicate/reorder → publish → public learner playback → unpublish. Repeat iPhone Safari 320/375/390/430px (avoid overflowing sticky actions). This cannot be inferred from source tests or public HTTP 200.

**Rollback:** revert this UI PR; no migrations or persisted-data change. Related pending phone-audio PR #1563 must be rechecked for conflicts on the same editor before merge.
