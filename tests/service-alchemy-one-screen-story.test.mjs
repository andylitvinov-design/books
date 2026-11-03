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
test("Alchemy one-screen landing keeps nine semantic chapters with the approved media in each",()=>{
 const s=read("components/alchemy-soul-landing.tsx"),css=read("components/alchemy-soul-landing.module.css");
 const panels=[["featured-video","<SiteVideoPlayer"],["hero","<StaticPortrait"],
  ["situations","<Image"],["method","<Image"],["video","<SiteVideoPlayer"],
  ["reviews","<SiteVideoPlayer"],["formats","<Image"],["faq","<Image"],["request","<StaticPortrait"]];
 for(let i=0;i<panels.length;i++){
  const [id,media]=panels[i],marker='data-alchemy-panel="'+id+'"';
  const at=s.indexOf(marker);
  assert.ok(at>=0,id+" chapter missing");
  const start=s.lastIndexOf("<section",at);
  const next=panels[i+1]?s.indexOf('data-alchemy-panel="'+panels[i+1][0]+'"',at+marker.length):-1;
  const end=next>=0?s.lastIndexOf("<section",next):s.indexOf("</main>",at);
  const panel=s.slice(start,end>start?end:undefined);
  assert.ok(panel.includes(media),id+" missing "+media);
 }
 assert.doesNotMatch(s,/data-alchemy-panel="report"/,"the fictional report remains a separate route, not a duplicate landing chapter");
 assert.match(s,/className=\{styles\.methodSteps\}/);
 assert.match(s,/t\.steps\.map/);
 assert.match(s,/sampleReport: "View a sample report"/);
 assert.match(s,/href=\{["']\/["'] \+ locale \+ ["']\/services\/alchemy-of-soul\/example-report["']\}/);
 assert.match(s,/data-testimonial-original-audio=\{locale === "es" \? "en" : locale\}/);
 for(const image of ["hero-olive-incense.webp","report-lighthouse-coast.avif","course-start-heron.webp","books-library.webp","andy-about.png"])assert.ok(s.includes(image));
 assert.match(css,/100svh/);
 assert.match(css,/@media\(max-width:350px\)/);
 assert.match(css,/@media\(max-height:650px\) and \(max-width:680px\)/);
});
test("Details, approved media, prices and contact flow remain reachable",()=>{
 const s=read("components/alchemy-soul-landing.tsx");
 for(const part of ['data-alchemy-panel="featured-video"','t.pains.map','t.steps.map','reviews.map((review)','data-alchemy-review-stack','youtubeId: "-zacUn_zN6g"','youtubeId: "IF0HAhSDwks"','<AlchemySoulFormatSelector locale={locale}','<ContactChannelChooser locale={locale} whatsappUrl={heroWhatsApp}','t.safety'])assert.ok(s.includes(part),"Missing "+part);
 assert.match(s,/sampleReport: "View a sample report"/);
 assert.match(s,/example-report/);
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
 assert.match(css,/@media\(max-width:350px\)/);
 assert.match(css,/@media\(max-height:650px\) and \(max-width:680px\)/);
 assert.match(css,/\.heroPortrait\{height:137px\}/);
 assert.match(css,/\.featuredVideoSection\{padding:15px 13px;gap:10px\}/);
 assert.match(css,/\.paymentDisclosure summary\{[^}]*min-height:44px/);
});

test("Alchemy/browser routes use semantic readiness and a read-only contact chooser",()=>{
 const s=read("scripts/verify-alchemy-one-screen.mjs");
 assert.match(s,/page\.goto\([^\n]+waitUntil:"domcontentloaded",timeout:45000/);
 assert.doesNotMatch(s,/waitUntil:"networkidle"/);
 assert.match(s,/assert\.equal\(response\?\.status\(\), 200/);
 assert.match(s,/expected nine chapters/);
 assert.match(s,/three published testimonial videos/);
 assert.match(s,/data-contact-channel-chooser/);
 assert.match(s,/personal-reply consent missing/);
 assert.match(s,/fictional sample report link missing/);
 assert.doesNotMatch(s,/data-session-booking-flow|data-booking-sku="personal-session-60"/);
 const pub=read("scripts/verify-public-services-production.mjs");
 assert.doesNotMatch(pub,/waitUntil:\s*"networkidle"/);
 assert.ok((pub.match(/waitUntil:\s*"domcontentloaded"/g)||[]).length >= 9);
 assert.match(pub,/data-booking-payment-options/);
 const css=read("components/alchemy-soul-landing.module.css");
 assert.match(css,/.page\[data-public-visual-landing="alchemy"\] \.panel\[data-alchemy-panel="request"\]/);
});

test("Public Services real consent flow opens optional contact name disclosure before typing",()=>{
 const chooser=read("components/contact-channel-chooser.tsx");
 const helper=read("scripts/helpers/contact-channel-verifier.mjs");
 assert.match(chooser,/<details className=\{styles\.optionalName\} open=\{nameOpen\}>/);
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
