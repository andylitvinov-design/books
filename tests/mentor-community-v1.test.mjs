import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

test("community reuses approved public practitioner and article sources", async () => {
  const [page, articlesRepo] = await Promise.all([
    read("app/[locale]/masters/page.tsx"),
    read("lib/practitioners/article-repository.js"),
  ]);
  assert.match(page, /listPublicPractitioners\(locale\)/);
  assert.match(page, /publicList\(locale\)/);
  assert.match(page, /<MarketplaceMasterFinder practitioners=/);
  assert.match(page, /<ArticleDirectory locale=\{locale\} preview articles=/);
  assert.match(page, /<MentorCommunitySwitch/);
  assert.match(page, /articles\.length > 0/);
  assert.match(articlesRepo, /a\.published<>'\{\}'::jsonb/);
  assert.match(articlesRepo, /p\.status in\('approved','submitted','changes_requested'\)/);
  assert.match(articlesRepo, /a\.published->>'locale'=\$1/);
  assert.doesNotMatch(page, /assessment_results|private_client|crm_contacts/);
});

test("community switch exposes an accessible, keyboard-driven two-panel view", async () => {
  const [switcher, css] = await Promise.all([
    read("components/mentor-community-switch.tsx"),
    read("components/mentor-community-switch.module.css"),
  ]);
  assert.match(switcher, /role="tablist"/);
  assert.match(switcher, /role="tabpanel"/);
  assert.match(switcher, /aria-selected=\{view === item\}/);
  assert.match(switcher, /hidden=\{view !== "mentors"\}/);
  assert.match(switcher, /hidden=\{view !== "articles"\}/);
  for (const key of ["ArrowRight", "ArrowLeft", "Home", "End"]) assert.ok(switcher.includes(key));
  for (const value of ["Find a mentor", "Сообщество наставников", "Comunidad de mentores"]) {
    assert.ok(switcher.includes(value));
  }
  assert.match(css, /min-height: 44px/);
  assert.match(css, /:focus-visible/);
});

test("article feed uses only persisted authors, published tags and in-site destinations", async () => {
  const [feed, articleIndex, masters, css] = await Promise.all([
    read("components/practitioner-article-directory.tsx"),
    read("app/[locale]/articles/page.tsx"),
    read("app/[locale]/masters/page.tsx"),
    read("components/practitioner-articles-public.module.css"),
  ]);
  assert.match(feed, /article\.practitionerSlug/);
  assert.match(feed, /article\.tags/);
  assert.match(feed, /article\.practitionerName/);
  assert.match(feed, /\/masters\//);
  assert.match(feed, /\/articles\//);
  assert.match(feed, /article\.coverPath/);
  assert.match(feed, /preview \? filtered\.slice\(0, 6\)/);
  assert.match(articleIndex, /publicList\(locale\)/);
  assert.match(articleIndex, /practitionerSlug: a\.practitionerSlug/);
  assert.match(masters, /practitionerSlug: a\.practitionerSlug/);
  assert.doesNotMatch(feed, /dangerouslySetInnerHTML|\.draft\.|fakeLikes|fakeRatings/);
  assert.match(css, /\.articleThumb/);
  assert.match(css, /@media\(max-width:430px\)/);
  assert.match(css, /:focus-visible/);
});

test("master shortcuts reuse existing Materials editor and public directory", async () => {
  const [practice, css] = await Promise.all([
    read("components/app/practice-workspace.jsx"),
    read("components/app/practice-dashboard.css"),
  ]);
  assert.match(practice, /hh-practice-community-shortcuts/);
  assert.match(practice, /\+locale\+'\/masters'/);
  assert.match(practice, /onClick=\{\(\)=>openMaterialsPanel\('articles'\)\}/);
  assert.match(practice, /Published after review/);
  assert.match(css, /\.hh-practice-community-shortcuts/);
  assert.match(css, /min-height:66px/);
  assert.match(css, /@media\(max-width:360px\)/);
});

test("empty community and server failures provide distinct, usable alternatives without exposing drafts", async () => {
  const [switcher, page, css, workflow, fixture, browser] = await Promise.all([
    read("components/mentor-community-switch.tsx"),
    read("app/[locale]/masters/page.tsx"),
    read("components/mentor-community-switch.module.css"),
    read(".github/workflows/mentor-community-acceptance.yml"),
    read("tests/helpers/seed-mentor-community-browser.mjs"),
    read("scripts/verify-mentor-community-browser.mjs"),
  ]);
  assert.match(page, /mastersUnavailable=\{mastersResult\.status === "rejected"\}/);
  assert.match(page, /articlesUnavailable=\{articlesResult\.status === "rejected"\}/);
  assert.match(switcher, /data-community-unavailable/);
  assert.match(switcher, /data-community-empty="articles"/);
  assert.match(switcher, /activate\("mentors", true\)/);
  assert.match(switcher, /materialTab=articles/);
  assert.match(switcher, /window\.location\.reload\(\)/);
  assert.match(css, /\.emptyActions/);
  assert.match(css, /min-height:44px/);
  assert.match(workflow, /postgres:17-alpine/);
  assert.match(workflow, /HH_APP_TEST_RUNTIME: isolated/);
  assert.match(workflow, /HH_APP_PRODUCTION_APPROVED: 'false'/);
  assert.match(fixture, /assertIsolated\(\)/);
  assert.match(fixture, /config\.test, true/);
  assert.match(fixture, /PRIVATE_PENDING_REVISION/);
  assert.match(browser, /chromium/);
  assert.match(browser, /webkit/);
  assert.match(browser, /noHorizontalOverflow/);
  assert.match(browser, /320, 375, 390, 430/);
  assert.doesNotMatch(browser, /request\.post\(|page\.route\(|submit\(.*enquiry/);
});
