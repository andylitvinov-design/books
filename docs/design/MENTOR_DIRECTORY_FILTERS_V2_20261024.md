# Mentor directory: visible discovery filters · 2026-10-24

## Decision
Improve **the existing** `/{locale}/masters` directory inside "Find a mentor", not a separate marketplace, profile, lead system or course database. The owner's 390px screenshot exposed the main defect: CSS `.singleMaster > .filters {order:1}` moved filters *after* the only public master card. Filters now always render before every card, at 320–430px and desktop.

## Filter hierarchy
1. Always visible: full-text search (name, method, service, city, published course title), **service type**, **course/training**, delivery format, language.
2. Compact immediate focus topics: show only topics matching at least one approved practitioner. Topic options reuse existing `MASTER_TOPICS` and approved profile/service area keys; there are no invented masters.
3. "Method, location, price & more" disclosure: actual methods, actual location labels, free/priced/price-on-request, alphabetical order, and the complete service-area taxonomy.
4. Visible result count, "clear filters", and honest no-match state; keyboard-navigable native selects; 44px min interactive targets; warm Holistic House palette. A course choice sets service type to `course` so selections do not contradict.
5. Label "Courses / training" lists **actual published course titles** (including original language), and approved service offerings with `offeringType=course`. When none exist, it says so and is disabled. No imaginary course subject, tuition, availability, rating or certification claims.

## Data and safety
- Practitioners/services: existing `createPractitionerRepository().listPublicPractitioners(locale)`. Only active/approved public snapshots. Type options derive from the actual `offeringType` values: session, assessment, package, group, workshop, course, event, intro.
- Standalone courses: existing `createPractitionerCourseRepository().catalog()` uses `c.status='published'` and `p.status='approved' and p.active`. Only public `{slug, practitionerSlug, title, description, locale}` are projected to the client; **never** draft/slides/media/clients.
- Course href reuses the existing `/{courseLocale}/courses/masters/{slug}`. Service links continue the existing consultation / remote-energy-support flow.
- Price applies only to a real published offering with a confirmed price (not an independent unpriced course). Service type is matched against the offered service and published course list.
- In case of course catalog failure, practitioner cards continue loading independently, and the course selector communicates unavailability.
- Does not alter database schema, RLS, payments, user consent, messaging, ads or publications.

## Acceptance
- Existing node:test contracts plus `tests/mentor-master-filters.test.mjs`.
- Existing isolated GitHub Actions Playwright acceptance script now checks filter-before-card, 4 visible top facets, actual `session` option, filter/search updates, reset, expanded disclosure and no 320/375/390/430 horizontal overflow, Chromium and WebKit. All QA uses the synthetic local Postgres/auth fixture and **cannot** submit live requests.
- Required: PR checks, ESLint/tsc/build; safe merge to actual Vercel production branch `codex/public-book-library`; confirm READY SHA and canonical alias `holistichouse.vercel.app` before describing this as live.
- Separate production manual gates: actual iPhone tap/scroll, approved master/course/public profile readback, authenticated service request/CRM persistence. Neither a green build nor an HTTP 200 proves those end-to-end flows.

Issue: [#1721](https://github.com/andylitvinov-design/books/issues/1721). Related main master network [#715](https://github.com/andylitvinov-design/books/issues/715).
