import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("Dialog-first homepage replaces old 'homepage stays server-rendered, with client behavi' contract", () => {
  const home=read("components/holistic-house-home.tsx");
  const dialog=read("components/home-dialog-first.tsx");
  assert.match(home, /<HomeDialogFirst locale=\{locale\}\/>/);
  assert.doesNotMatch(home, /<ProfileHubTabs|<HomeSectionCarousel|<HomeFeaturedWorkspace|<HomeMoreDisclosure|<PersonalTestimonials|<HomepageContactCta/);
  assert.match(dialog, /data-hh-home-composer/);
  assert.match(dialog, /data-hh-home-business-switch/);
  assert.match(dialog, /data-hh-home-starters/);
  assert.match(dialog, /window\.sessionStorage\.setItem\(HOME_AI_HANDOFF_KEY,payload\)/);
});

