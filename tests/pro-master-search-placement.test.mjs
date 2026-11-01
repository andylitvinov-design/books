import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const holistic = source("app/[locale]/holistic-support/page.tsx");
const pro = source("app/[locale]/pro/page.tsx");
const hub = source("components/profi-hub.tsx");
const finder = source("components/master-network-explorer.tsx");
const css = source("components/master-network-explorer.module.css");
test("Approved practitioners are searchable directly in Pro, not Holistic Support", () => {
  assert.doesNotMatch(holistic, /MarketplaceMasterFinder|data-holistic-practitioners|createPractitionerRepository/);
  assert.match(holistic, /<HolisticSupportTopicFilter locale=\{locale\} \/>/);
  // The previous external remote-support link was replaced with a genuine inline
  // energy/talisman order; preserve explicit click, expanded state and real form.
  const topicFilter = source("components/holistic-support-topic-filter.tsx");
  assert.match(topicFilter, /data-holistic-order-trigger=\{id\}/);
  assert.match(topicFilter, /onClick=\{\(\) => openOrder\(id === "talisman" \? "talisman" : "energy"\)\}/);
  assert.match(topicFilter, /aria-controls="holistic-inline-order"/);
  assert.match(topicFilter, /\{orderKind && \(/);
  assert.match(topicFilter, /<HolisticInlineSupportOrder locale=\{locale\} kind=\{orderKind\}/);
  assert.match(source("components/holistic-inline-support-order.tsx"), /mode="inline" selectedKind=\{choice\} initialGoal=\{topic\}/);
  assert.doesNotMatch(holistic, /data-holistic-offer=/);
  assert.match(pro, /listPublicPractitioners\(locale\)/);
  assert.match(pro, /createPractitionerCourseRepository\(config\)\.catalog\(\)/);
  assert.match(pro, /approvedSlugs\.has\(row\.practitionerSlug\)/);
  assert.match(pro, /<MarketplaceMasterFinder practitioners=\{practitioners\} courses=\{courses\}/);
  assert.match(hub, /data-profi-master-directory/);
  assert.match(hub, /href="#profi-find-master" prefetch=\{false\} data-profi-path="find"/);
  assert.match(hub, /directoryUnavailable/);
});
test("Compact Pro finder retains filters, public links and 320-430px CSS", () => {
  assert.match(finder, /embedded\?: boolean/);
  assert.match(finder, /embedded=\{embedded\}/);
  assert.match(finder, /data-mentor-embedded=/);
  assert.match(finder, /data-mentor-primary-filters/);
  assert.match(finder, /data-mentor-cards/);
  assert.match(finder, /getPublicServiceDetailHref\(/);
  assert.match(css, /\.embeddedExplorer \.masterQuickBar\{display:flex;grid-template-columns:none;overflow-x:auto/);
  assert.match(css, /@media\(max-width:430px\)/);
  assert.match(css, /@media\(max-width:355px\)/);
  assert.match(css, /min-height:44px/);
});
