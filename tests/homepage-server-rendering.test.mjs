import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("homepage stays server-rendered, with client behavior in leaf boundaries only", () => {
  const home = read("components/holistic-house-home.tsx");
  assert.doesNotMatch(home, /^["']use client["'];?/m);
  assert.doesNotMatch(home, /use(?:State|Effect|Ref|Memo|Callback)\s*\(|\b(?:window|document|localStorage|sessionStorage)\./);
  assert.match(home, /<AcquisitionEventLink/);
  assert.match(home, /<SiteNavigation locale=\{locale\}/);
  assert.doesNotMatch(home, /HomeFreePaths/);
  const deferred = read("components/home-more-disclosure.tsx");
  // The approved seven-stage homepage replaces the repeated lower service grid.
  // Only optional conversation guidance is deferred, and only after explicit disclosure.
  assert.match(home, /<HomeMoreDisclosure locale=\{locale\} \/>/);
  assert.match(home, /<HomeFeaturedWorkspace locale=\{locale\} \/>/);
  for (const source of [home, deferred]) {
    assert.doesNotMatch(source, /ServicesSolutions|HomeExploreSections|TestSelectionCourseBanner/);
  }
  assert.match(deferred, /const HomeConversationGuide = dynamic\([\s\S]*?import\("\.\/home-conversation-guide"\)[\s\S]*?ssr: false/);
  assert.match(deferred, /const \[expanded, setExpanded\] = useState\(false\)/);
  assert.match(deferred, /<details[\s\S]*?onToggle=\{event => setExpanded\(event\.currentTarget\.open\)\}/);
  assert.match(deferred, /<summary>/);
  assert.match(deferred, /\{expanded \? <HomeConversationGuide locale=\{locale\} \/> : null\}/);
  assert.match(read("app/page.tsx"), /<HolisticHouseHome/);
  assert.match(read("app\/\[locale\]\/page.tsx"), /<HolisticHouseHome/);
  assert.match(read("components/site-navigation.tsx"), /^["']use client["']/m);
  assert.match(read("components/acquisition-event-link.tsx"), /^["']use client["']/m);
});
