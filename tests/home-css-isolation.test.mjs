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
  assert.match(wrapper, /dynamic\(/);
  assert.match(wrapper, /ssr: false/);
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
  assert.match(home, /ideas-pine-reference\.webp" fetchPriority="high"/);
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

test("Home compact header uses the same menu markup without hidden full-header modules", () => {
  const full = read("components/site-navigation.tsx");
  const compact = read("components/site-navigation-compact.tsx");
  const home = read("components/home-dialogue-entry.tsx");
  assert.match(home, /from "@\/components\/site-navigation-compact"/);
  assert.match(home, /<SiteNavigation locale=\{locale\} compact \/>/);
  assert.doesNotMatch(compact, /CartNavLink|HeaderCreditProfile|HomePersonalSpaceNavEntry|commerce\/cart-nav-link/);
  assert.match(compact, /className="site-navigation site-navigation--profile-compact"/);
  assert.match(compact, /<SiteSearch locale=\{activeLocale\} pathname=\{pathname\} \/>/);
  const start = '    <details className="site-main-menu" ref={siteMenuRef}>';
  assert.ok(full.includes(start) && compact.includes(start));
  assert.equal(compact.slice(compact.indexOf(start)), full.slice(full.indexOf(start)), "compact menu markup, links, handlers must stay identical");
  const commonStart = "const shopMenuCopy =";
  assert.ok(compact.includes(commonStart) && full.includes(commonStart));
  for (const key of ["const shopMenuCopy", "const myCoachMenuCopy", "const siteMenuCopy"]) assert.ok(compact.includes(key));
  assert.match(compact, /document.addEventListener\('keydown', escape\)/);
  assert.match(compact, /getCompactNavigation\(activeLocale\)/);
  assert.match(compact, /savePublicLocale\(locale\)/);
});
test("Hidden persona selector CSS starts only on explicit open, not with the Home route", () => {
  const home = read("components/home-dialogue-entry.tsx");
  assert.match(home, /const AliPersonaPicker=lazy\(\(\)=>import\("@\/components\/app\/ali-persona-picker"\)\)/);
  assert.match(home, /personaOpen&&<Suspense fallback=\{null\}><AliPersonaPicker/);
  assert.doesNotMatch(home, /const AliPersonaPicker=dynamic\(/);
});
test("Spanish Home links do not prefetch unrelated route bundles before an explicit navigation", () => {
  const es = read("app/es/page.tsx");
  for (const link of ['href="/es/about"', 'href="/es/books"', 'href="/es"', 'href="/es/services"']) {
    assert.ok(es.includes(link + " prefetch={false}"), link);
  }
});
