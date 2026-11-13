import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("approved light mobile dock includes elevated AI hero and keeps iPhone protections", () => {
  const css = read("components/unified-mobile-dock.module.css");
  const overrides = read("app/unified-mobile-dock.css");
  assert.match(css, /grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);
  assert.match(css, /position:fixed;z-index:58;bottom:0;/);
  assert.match(css, /left:0;right:0;margin-inline:auto/);
  assert.match(css, /data-unified-dock-item="ai"/);
  assert.match(css, /top:-38px;left:50%;transform:translateX\(-50%\)/);
  assert.match(css, /radial-gradient\(circle at 35% 18%,#58d4b9/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /@media\(max-width:354px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.doesNotMatch(css, /overflow:hidden/);
  assert.doesNotMatch(overrides, /MyTube dark-mode exception|background:rgba\(15,15,15/);
  assert.match(overrides, /data-keyboard-open="true"/);
  assert.match(overrides, /--hh-unified-nav-height,94px/);
});
