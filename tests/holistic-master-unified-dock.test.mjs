import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {isUnifiedMobileDockPath,unifiedMobileDockActive,unifiedMobileDockHref,UNIFIED_DOCK_IDS} from "../lib/unified-mobile-dock.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Holistic first-screen WebKit/browser acceptance uses the real seven-tab dock, not retired Temple nav",()=>{
  const script=read("scripts/verify-holistic-master-browser.mjs");
  const dock=read("components/unified-mobile-dock.tsx");
  assert.ok(script.includes("const dock = page.locator('[data-hh-unified-dock]')"));
  assert.ok(script.includes("dock.locator('[data-unified-dock-item]')"));
  assert.ok(script.includes("page.locator('.mobile-bottom-navigation:visible').count()"));
  assert.ok(script.includes("await study.waitFor({state:\"visible\",timeout:15000})"));
  assert.ok(script.includes("study.getAttribute(\"href\")"));
  assert.ok(script.includes("await offers.waitFor({state: \"visible\", timeout: 10000})"));
  assert.ok(!script.includes("page.locator('.mobile-bottom-navigation [data-nav-item=\"temple\"]')"));
  assert.ok(dock.includes("data-hh-unified-dock"));
  assert.ok(dock.includes("data-unified-dock-item={id}"));
  assert.deepEqual(UNIFIED_DOCK_IDS,["mytube","video","coach","ai","services","practice","profile"]);
  for(const locale of ["en","ru","es"]){
    const overview="/"+locale+"/holistic-support";
    assert.equal(isUnifiedMobileDockPath(overview),true);
    assert.equal(unifiedMobileDockActive(overview),null);
    assert.equal(unifiedMobileDockHref(locale,"practice"),"/"+locale+"/shamanica");
  }
});
