import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>readFileSync(resolve(root,p),"utf8");
const script=read("scripts/verify-holistic-master-browser.mjs");
const dock=read("components/unified-mobile-dock.tsx");
const model=read("lib/unified-mobile-dock.mjs");
const legacy=read("components/mobile-bottom-navigation.tsx");

test("Holistic Support QA targets the actual seven-item dock, not removed Temple tab",()=>{
  assert.match(script, /data-hh-unified-dock/);
  assert.match(script, /data-unified-dock-item="practice"/);
  assert.doesNotMatch(script, /mobile-bottom-navigation \[data-nav-item="temple"\]/);
  assert.match(script, /mobile-bottom-navigation:visible/);
  assert.match(script, /holistic-support\/mobile/);
  assert.match(script, /navTarget\.height >= 44 && navTarget\.width >= 44/);
  assert.match(script, /getAttribute\("aria-current"\), null/);
});
test("The current navigation implementation supports all three locales and no duplicates",()=>{
  assert.match(model, /UNIFIED_DOCK_IDS=Object\.freeze\(\["mytube","video","coach","ai","services","practice","profile"\]\)/);
  assert.match(dock, /data-unified-dock-item=\{id\}/);
  assert.match(dock, /en: \{ mytube: "MyTube".*practice: "Study"/);
  assert.match(dock, /ru: \{ mytube: "MyTube".*practice: "Обучение"/);
  assert.match(dock, /es: \{ mytube: "MyTube".*practice: "Estudiar"/);
  assert.match(legacy, /isUnifiedMobileDockPath\(pathname\)/);
  assert.match(script, /await unifiedDock\.locator\("\[data-unified-dock-item\]"\)\.count\(\), 7/);
});
