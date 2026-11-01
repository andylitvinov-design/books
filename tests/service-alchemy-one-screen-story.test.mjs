import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assertSyntheticLoopback, openRegisteredContactChannelChooser, openRegisteredCompactPhoneChooser } from '../scripts/helpers/contact-channel-verifier.mjs';
const read = p => readFileSync(new URL("../"+p,import.meta.url),"utf8");
test('synthetic consent helper refuses public and non-loopback origins', () => {
 for (const url of ['http://localhost:3123/x', 'http://127.0.0.1:3123/x', 'http://[::1]:3123/x']) assert.doesNotThrow(() => assertSyntheticLoopback(url));
 for (const url of ['https://holistichouse.vercel.app/en/services', 'https://localhost.example.com/', 'file:///tmp/a', 'not-a-url']) assert.throws(() => assertSyntheticLoopback(url), /SYNTHETIC_LOOPBACK_REQUIRED/);
});
test('synthetic Public Services browser blocks service workers before interception', () => {
 assert.match(read('scripts/verify-public-services-production.mjs'), /newContext\(\{[^\n]*serviceWorkers:\s*['"]block['"]/);
 assert.match(read('scripts/verify-release-reaudit.mjs'), /newContext\(\{[^\n]*reducedMotion:\s*'reduce',\s*serviceWorkers:\s*'block'/);
 assert.match(read('scripts/verify-release-reaudit.mjs'), /context\.route\('\*\*\/api\/\*\*'[\s\S]*?route\.abort/);
});
test('both synthetic submit helpers reject deployed origins before touching the page', async () => {
 const page = {url: () => 'https://holistichouse.vercel.app/en/services'};
 for (const helper of [openRegisteredContactChannelChooser, openRegisteredCompactPhoneChooser]) {
  await assert.rejects(() => helper(null, null, page), /SYNTHETIC_LOOPBACK_REQUIRED/);
 }
});
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

test("Alchemy/browser routes use semantic readiness with real booking and privacy oracles",()=>{
 const s=read("scripts/verify-alchemy-one-screen.mjs");
 assert.match(s,/page\.goto\([^\n]+waitUntil:"domcontentloaded",timeout:45000/);
 assert.doesNotMatch(s,/waitUntil:"networkidle"/);
 assert.match(s,/assert\.equal\(response\?\.status\(\), 200/);
 assert.match(s,/data-session-booking-flow/);
 assert.match(s,/data-booking-payment-options/);
 assert.match(s,/booking submit enabled before phone and consent/);
 assert.doesNotMatch(s,/data-compact-phone-trigger/);
 const pub=read("scripts/verify-public-services-production.mjs");
 assert.doesNotMatch(pub,/waitUntil:\s*"networkidle"/);
 assert.ok((pub.match(/waitUntil:\s*"domcontentloaded"/g)||[]).length >= 9);
 assert.match(pub,/data-booking-payment-options/);
 const css=read("components/alchemy-soul-landing.module.css");
 assert.match(css,/\.page\[lang="ru"\] \.requestSection\{gap:6px;padding-top:9px;padding-bottom:9px\}/);
});

test("Public Services real consent flow opens optional contact name disclosure before typing",()=>{
 const chooser=read("components/contact-channel-chooser.tsx");
 const helper=read("scripts/helpers/contact-channel-verifier.mjs");
 assert.match(chooser,/<details className={styles.optionalName}>/);
 assert.match(chooser,/autoComplete="name"/);
 assert.ok(helper.includes('const nameDisclosure = form.locator(\'details:has(input[autocomplete="name"])\')'));
 assert.ok(helper.includes('const name = nameDisclosure.locator(\'input[autocomplete="name"]\')'));
 const reveal=helper.indexOf("await nameDisclosure.locator('summary').click()");
 const input=helper.indexOf("await name.fill('Public QA Visitor')");
 assert.ok(reveal>=0 && input>reveal,"optional contact name disclosure must open before actual browser fill");
 assert.match(helper,/await expect\(name\)\.toBeVisible\(\)/);
 assert.match(helper,/contactConsent,true/);
 assert.match(helper,/submissions\.length,1/);
});
