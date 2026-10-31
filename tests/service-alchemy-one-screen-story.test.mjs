import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = p => readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Alchemy one-screen chapters preserve one visual each",()=>{
 const s=read("components/alchemy-soul-landing.tsx"),css=read("components/alchemy-soul-landing.module.css");
 const panels=[["featured-video","video","<SiteVideoPlayer"],["hero","photo","<StaticPortrait"],
 ["situations","photo","<Image"],["method","photo","<Image"],["report","photo","<Image"],["video","video","<SiteVideoPlayer"],
 ["reviews","video","<SiteVideoPlayer"],["formats","photo","<Image"],["faq","photo","<Image"],["request","photo","<Image"]];
 for(let i=0;i<panels.length;i++){
  const [id,kind,media]=panels[i],at=s.indexOf('data-alchemy-panel="'+id+'" data-alchemy-visual="'+kind+'"');
  assert.ok(at>=0,id+" chapter missing");
  const end=i+1<panels.length?s.indexOf('data-alchemy-panel="'+panels[i+1][0]+'"',at+1):s.indexOf('<p className={styles.safety}>',at+1);
  assert.ok(s.slice(at,end>at?end:undefined).includes(media),id+" missing "+media);
 }
 assert.match(s,/data-alchemy-method-sequence/);
 assert.match(s,/data-alchemy-report-example/);
 assert.match(s,/example-report/);
 for(const image of ["hero-olive-incense.webp","report-lighthouse-coast.webp","andy-about.png"])assert.ok(s.includes(image));
 assert.match(css,/100svh/);assert.match(css,/max-height:650px/);
});
test("Details, approved media, prices and contact flow remain reachable",()=>{
 const s=read("components/alchemy-soul-landing.tsx");
 for(const part of ['data-alchemy-details="introduction"','t.pains.slice(1)','t.steps.map','reviews.map((review)','data-vertical-review-list','youtubeId: "-zacUn_zN6g"','youtubeId: "IF0HAhSDwks"','<AlchemySoulFormatSelector','<ContactChannelChooser','t.safety'])assert.ok(s.includes(part),"Missing "+part);
 assert.equal((s.match(/<AlchemySoulLeadForm locale=\{locale\}/g)||[]).length,1);
 for(const locale of ["ru: {","en: {","es: {"])assert.ok(s.includes(locale));
});

test("Very short iPhone keeps session descriptions and prices through progressive detail",()=>{
 const form=read("components/alchemy-soul-lead-form.tsx");
 const css=read("components/alchemy-soul-landing.module.css");
 assert.match(form,/data-alchemy-format-details/);
 assert.match(form,/data\.shortText/);
 assert.match(form,/data\.longText/);
 assert.match(form,/data\.monthNote/);
 assert.match(form,/data-alchemy-format="30"/);
 assert.match(form,/data-alchemy-format="60"/);
 assert.match(form,/data-alchemy-format="month"/);
 assert.match(css,/@media\(max-width:350px\) and \(max-height:650px\)/);
 assert.match(css,/\.optionsSection \.formatMore\{display:block\}/);
 assert.match(css,/\.featuredVideoMedia\{width:min\(100%,215px\)/);
 assert.match(css,/\.heroPortrait\{height:74px\}/);
 assert.match(css,/\.optionsSection \.paymentDisclosure summary\{min-height:40px/);
});

// This browser contract avoids per-viewport 45s network-idle timeouts on healthy
// streaming pages, but does not turn a route or geometry failure into a pass.
test("Alchemy browser waits for semantic DOM readiness, preserving every release assertion",()=>{
 const source=read("scripts/verify-alchemy-one-screen.mjs");
 assert.match(source,/page\.goto\([^\n]+waitUntil:"domcontentloaded",timeout:45000/);
 assert.doesNotMatch(source,/waitUntil:"networkidle"/);
 assert.match(source,/assert\.equal\(response\?\.status\(\), 200/);
 assert.match(source,/root\.locator\('h1'\)\.waitFor/);
 assert.match(source,/data\.panels\.length !== chapters\.length/);
 assert.match(source,/data\.documentWidth > width \+ 1/);
 assert.match(source,/assert\.deepEqual\(failures, \[\]/);
 assert.match(source,/data-session-booking-flow/);
 assert.match(source,/data-booking-sku="personal-session-60"/);
 assert.match(source,/data-booking-step="contact"/);
 assert.match(source,/booking reply-only opt-in consent missing/);
 assert.match(source,/payment opened without confirmed booking/);
 assert.match(source,/booking submit enabled before phone and consent/);
 assert.doesNotMatch(source,/data-compact-phone-trigger/);
 const css=read("components/alchemy-soul-landing.module.css");
 assert.match(css,/\.page\[lang="ru"\] \.requestSection\{gap:6px;padding-top:9px;padding-bottom:9px\}/);
});


test("public services browser uses DOM readiness while preserving every real privacy, media and booking gate",()=>{
 const source=read("scripts/verify-public-services-production.mjs");
 assert.equal((source.match(/waitUntil:\s*["']domcontentloaded["']/g)||[]).length,10);
 assert.doesNotMatch(source,/waitUntil:\s*["']networkidle["']/);
 for(const contract of [
   "Public acceptance may run only against an isolated loopback server",
   "assert.equal(directoryResponse?.status(), 200",
   'await visible(main.locator("h1"))',
   'await visible(page.locator("#services-conversion-title"))',
   "data-business-consulting",
   "data-alchemy-lead-form",
   "data-booking-payment-options",
   "data-alchemy-panel",
   "The dedicated Services catalog must load",
   "The free consultation hub reuses the same three offers",
   "assertNoDevIssueOverlay",
   "assertViewport",
 ]) assert.ok(source.includes(contract),"Required real acceptance was lost: "+contract);
 for(const image of ["photo","portrait"])assert.ok(
   source.includes('await expect('+image+').toHaveJSProperty("complete", true, { timeout: 15000 })'),
   image+" must load before genuine naturalWidth is checked");
 assert.match(source,/naturalWidth > 100/);
 assert.match(source,/naturalWidth > 20/);
 assert.doesNotMatch(source,/continue-on-error/);
});
