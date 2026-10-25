import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

test("mentor filters are visible before all practitioner cards, including a single card", async () => {
  const [page, finder, css] = await Promise.all([
    read("app/[locale]/masters/page.tsx"),
    read("components/master-network-explorer.tsx"),
    read("components/master-network-explorer.module.css"),
  ]);
  assert.match(page, /<MarketplaceMasterFinder practitioners=/);
  assert.match(finder, /data-mentor-filters/);
  assert.match(finder, /data-mentor-primary-filters/);
  assert.match(finder, /id="mentor-filter-offering"/);
  assert.match(finder, /id="mentor-filter-course"/);
  assert.match(finder, /<Filters locale=\{locale\} mode="masters"/);
  assert.ok(finder.indexOf("<Filters locale={locale} mode=\"masters\"") <
    finder.indexOf('data-mentor-cards'), "Filters render before cards");
  assert.doesNotMatch(css, /\.singleMaster\s*>\s*\.filters\s*\{[^}]*order\s*:\s*1/);
  assert.match(css, /\.mentorFilterGrid/);
  assert.match(css, /@media \(max-width:430px\)/);
  assert.match(css, /min-height:44px/);
});

test("real offering types, methods, locations, languages and course metadata drive filters", async () => {
  const [finder, page, repository, types] = await Promise.all([
    read("components/master-network-explorer.tsx"),
    read("app/[locale]/masters/page.tsx"),
    read("lib/practitioners/course-repository.js"),
    read("lib/practitioners/public-types.ts"),
  ]);
  assert.match(finder, /service\.offeringType/);
  assert.match(finder, /OFFERING_TYPES\.filter/);
  assert.match(finder, /state\.courseKey/);
  assert.match(finder, /publishedCourses/);
  assert.match(finder, /f\.method/);
  assert.match(finder, /f\.location/);
  assert.match(finder, /f\.language/);
  assert.match(finder, /f\.pricing/);
  assert.match(finder, /matchingMasterServices\(master, f\)/);
  assert.match(finder, /matchingMasterCourses\(master, f, courses\)/);
  assert.match(finder, /requiresSpecificOffering/);
  assert.match(finder, /chosenServiceId/);
  assert.match(finder, /const firstService = queryMatches\[0\] \|\| filteredServices\[0\]/);
  assert.match(finder, /getPublicServiceDetailHref/);
  assert.match(finder, /\/courses\/masters\//);
  assert.match(page, /createPractitionerCourseRepository\(config\)\.catalog\(\)/);
  assert.match(page, /coursesResult\.status === "rejected"/);
  assert.match(page, /const masterSlugs = new Set\(practitioners\.map/);
  assert.match(repository, /c\.status='published'/);
  assert.match(repository, /p\.status='approved' and p\.active/);
  assert.match(types, /export type PublicMentorCourse/);
  assert.doesNotMatch(page, /draft_copy|private_client|assessment_results|crm_contacts/);
});

test("browser acceptance exercises mobile ordering and real filter interactions", async () => {
  const script = await read("scripts/verify-mentor-community-browser.mjs");
  assert.match(script, /menuBox\.y \+ menuBox\.height <= cardBox\.y/);
  assert.match(script, /offers\.selectOption\("session"\)/);
  assert.match(script, /searchMentors\.fill\("NO_SYNTHETIC_MENTOR_MATCH_887"\)/);
  assert.match(script, /moreMentorFilters\.tap\(\)/);
  assert.match(script, /find a mentor must be the default view/);
  assert.match(script, /online course must not match an in-person-only choice/);
  assert.match(script, /explicit articles deep link opens articles/);
  assert.match(script, /noHorizontalOverflow\(page, label \+ " expanded filters"\)/);
  assert.match(script, /320, 375, 390, 430/);
});
