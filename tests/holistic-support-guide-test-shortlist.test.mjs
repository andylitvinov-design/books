import assert from "node:assert/strict";
import test from "node:test";
import { buildExplorerEntries } from "../lib/assessments/test-explorer.js";
import { buildSupportGuideTestShortlists, SUPPORT_GUIDE_TEST_FOCUS } from "../lib/assessments/support-guide-tests.js";

test("V2 guide never invents or leaks tests: 4 editorial topics, 2 rights-cleared public starters max",()=>{
  const entries=buildExplorerEntries({locale:"en",audience:"guest"});
  const byKey=new Map(entries.map(x=>[x.key,x]));
  const out=buildSupportGuideTestShortlists({locale:"en",entries});
  assert.deepEqual(Object.keys(out).sort(),["energy","love","meaning","money"].sort());
  for(const [topic,items] of Object.entries(out)){
    assert.ok(SUPPORT_GUIDE_TEST_FOCUS[topic],topic);
    assert.ok(items.length<=2,topic+" only two choices");
    assert.equal(new Set(items.map(x=>x.key)).size,items.length,topic+" no duplicates");
    for(const item of items){
      const entry=byKey.get(item.key);
      assert.ok(entry,topic+" real registry key");
      assert.equal(entry.selectable,true);
      assert.equal(entry.startable,true);
      assert.equal(entry.guestEligible,true);
      assert.equal(entry.free,true);
      assert.equal(entry.rightsStatus,"cleared");
      assert.notEqual(entry.explicitOptIn,true);
      assert.ok(item.durationMinutes>=1&&item.durationMinutes<=3,topic+" verified short duration");
      assert.equal(item.durationMinutes,entry.durationMinutes,topic+" no made-up one minute");
      assert.match(item.href,/^\/en\/client\?startTests=[a-z0-9%-]+$/);
      assert.equal(item.href.split("startTests=")[1],encodeURIComponent(item.key));
    }
  }
});

test("unsupported or disallowed quizzes are never shown; ES links use existing English instrument",()=>{
  const empty=buildSupportGuideTestShortlists({locale:"en",entries:[]});
  assert.ok(Object.values(empty).every(items=>items.length===0));
  const es=buildSupportGuideTestShortlists({locale:"es"});
  assert.ok(Object.values(es).flat().every(item=>item.href.startsWith("/en/client?startTests=")));
});
