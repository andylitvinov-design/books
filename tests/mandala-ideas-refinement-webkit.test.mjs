import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

// The real browser E2E remains mandatory; this contract protects its native
// disclosure wiring so a future refactor cannot silently reintroduce the
// WebKit portal-remount regression.
const director=readFileSync(new URL("../components/mandala-auto-video-director.tsx",import.meta.url),"utf8");
const webkit=readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs",import.meta.url),"utf8");

test("Ideas disclosure preserves a real summary click across WebKit portal rerenders",()=>{
  assert.match(director,/data-video-ideas-refinement/);
  assert.match(director,/onClick=\{event=>\{[\s\S]*?event\.preventDefault\(\);[\s\S]*?details\.open=!details\.open;[\s\S]*?ideaRefinementOpenRef\.current=details\.open;/);
  assert.match(director,/if\(node && ideaRefinementOpenRef\.current\)node\.open=true/);
  assert.doesNotMatch(director,/open=\{ideaRefinementOpen\}/);
  assert.match(webkit,/await refinement\.locator\(":scope > summary"\)\.click\(\)/);
  assert.match(webkit,/await expect\(refinement\)\.toHaveAttribute\("open",""\)/);
});
