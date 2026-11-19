import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classifyPublicLead } from "../lib/public-lead-capture.js";
import { isUnifiedMobileDockPath } from "../lib/unified-mobile-dock.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Home loads only one real dock and does not bundle irrelevant global chrome", () => {
 const layout = read("app/layout.tsx");
 const scoped = read("components/route-scoped-public-chrome.tsx");
 assert.match(layout, /<RouteScopedMobileNavigation initialLocale=\{lang\}/);
 assert.match(layout, /<RouteScopedLeadCapture\s*\/>/);
 assert.doesNotMatch(layout, /<SitewideLeadCapture\s*\/>|<MobileBottomNavigation initialLocale/);
 assert.match(scoped, /classifyPublicLead\(pathname\)/);
 assert.match(scoped, /isUnifiedMobileDockPath\(pathname\)/);
 assert.match(scoped, /import\("\.\/sitewide-lead-capture"\)/);
 assert.match(scoped, /import\("\.\/mobile-bottom-navigation"\)/);
 assert.doesNotMatch(scoped, /ssr:\s*false/); // Public service CTA still SSRs.
 for (const path of ["/","/ru","/es","/en","/ru/","/es/"]) {
  assert.equal(classifyPublicLead(path),null,path);
  assert.equal(isUnifiedMobileDockPath(path),true,path);
 }
});

test("all language service and academy pages retain their real public CTAs",()=>{
 for (const locale of ["en","ru","es"]) {
  assert.equal(classifyPublicLead("/"+locale+"/services")?.kind,"personal");
  assert.equal(classifyPublicLead("/"+locale+"/academy")?.kind,"training");
  assert.equal(classifyPublicLead("/"+locale+"/app"),null);
  assert.equal(isUnifiedMobileDockPath("/"+locale+"/app/messages"),true);
 }
 assert.equal(isUnifiedMobileDockPath("/en/client/legacy-form"),false);
});

test("compact Home navigation does not eagerly import full-site cart or owner credit state",()=>{
 const nav=read("components/site-navigation.tsx");
 assert.match(nav,/const CartNavLink = dynamic\(/);
 assert.match(nav,/const HeaderCreditProfile = dynamic\(/);
 assert.match(nav,/const HomePersonalSpaceNavEntry = dynamic\(/);
 assert.match(nav,/<SiteSearch locale=\{activeLocale\} pathname=\{pathname\}/);
 assert.match(nav,/<CartNavLink locale=\{activeLocale\}/);
 assert.match(nav,/<HeaderCreditProfile locale=\{activeLocale\}/);
 assert.doesNotMatch(nav,/ssr:\s*false/);
});

test("release audits check Life guest tab and hydrated Home soft navigation",()=>{
 const audit=read("scripts/verify-release-reaudit.mjs");
 const history=read("scripts/csp-history-provenance-probe.mjs");
 const hub=read("components/app/profile-space-dashboard.jsx");
 assert.match(hub,/data-profile-space-life/);
 assert.match(audit,/data-profile-space-life/);
 assert.match(audit,/data-home-interactive="true"/);
 assert.match(audit,/toHaveURL\(origin \+ '\/en\/about', \{ timeout: 30000 \}\)/);
 assert.match(history,/data-home-interactive="true"/);
});
