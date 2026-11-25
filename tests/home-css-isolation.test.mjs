import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { classifyPublicLead } from "../lib/public-lead-capture.js";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("root defers CSS-heavy sitewide enquiry controls and preserves the original route filter", () => {
  const layout = read("app/layout.tsx");
  const wrapper = read("components/sitewide-lead-capture-deferred.tsx");
  assert.match(layout, /<SitewideLeadCaptureDeferred \/>/);
  assert.doesNotMatch(layout, /<SitewideLeadCapture \/>/);
  // The import remains deferred until an eligible route mounts on the client.
  // Its rejection must be handled instead of escaping React.lazy on WebKit.
  assert.match(wrapper, /useEffect\(\(\) => \{/);
  assert.match(wrapper, /if \(!classifyPublicLead\(pathname\) \|\| Capture\) return/);
  assert.match(wrapper, /loadOptionalLeadCapture\(/);
  assert.match(wrapper, /if \(!route\) return null/);
  assert.doesNotMatch(wrapper, /import\s+[^;\n]+\s+from\s+["\']\.\/sitewide-lead-capture["\']/);
  assert.match(wrapper, /classifyPublicLead\(pathname\)/);
  assert.match(wrapper, /import\("\.\/sitewide-lead-capture"\)/);
  assert.match(read("components/sitewide-lead-capture.tsx"), /const route = clientPath \? classifyPublicLead\(clientPath\) : null/);
});
test("every homepage URL is excluded, but existing public enquiry placements remain eligible", () => {
  for (const path of ["/","/ru","/es","/en","/ru/","/es/","/admin","/en/app/messages","/en/client"]) {
    assert.equal(classifyPublicLead(path), null, path);
  }
  for (const path of ["/en/academy","/ru/library","/es/services","/books/maya-tradition","/en/services/hypnotherapy-course"]) {
    assert.ok(classifyPublicLead(path), path);
  }
});
test("React Home preloads the actual first-screen persona portrait and existing scenic background", () => {
  const home=read("components/home-dialogue-entry.tsx");
  assert.match(home, /href=\{picture\} fetchPriority="high"/);
  assert.doesNotMatch(home, /ideas-pine-reference\.webp" fetchPriority="high"/);
  assert.match(home, /loading="eager" fetchPriority="high"/);
  assert.match(home, /data-home-dialogue-entry/);
});
test("experimental global CSS inlining cannot silently bring back multi-megabyte HTML", () => {
  const config=read("next.config.ts");
  assert.doesNotMatch(config, /inlineCss\s*:\s*true/);
});

test("hidden Home catalogs use observer/disclosure-triggered React.lazy with no initial CSS", () => {
  const observer=read("components/home-deferred-sections.tsx");
  const content=read("components/home-deferred-content.tsx");
  assert.match(observer, /IntersectionObserver/);
  assert.match(observer, /const HomeDeferredContent = lazy\(/);
  assert.match(observer, /visible\?<Suspense fallback=\{null\}>/);
  assert.match(content, /const HomeExpandedCatalog = lazy\(/);
  assert.match(content, /expanded\?<Suspense fallback=\{null\}>/);
});
