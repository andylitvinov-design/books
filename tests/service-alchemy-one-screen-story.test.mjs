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

test("390px phone formats remain full-content and fit a real one-screen viewport", () => {
 const css=read("components/alchemy-soul-landing.module.css");
 const form=read("components/alchemy-soul-lead-form.tsx");
 assert.match(css, /@media \(min-width:351px\) and \(max-width:680px\) and \(max-height:850px\)/);
 assert.match(css, /\.optionsSection>\.panelPhoto\{height:50px;margin-bottom:6px\}/);
 assert.match(css, /\.optionsSection \.freeOption\{margin-top:3px\}/);
 for(const marker of ['data-alchemy-format="30"','data-alchemy-format="60"','data-alchemy-format="month"','data-alchemy-format-details','data-alchemy-booking-formats'])
   assert.ok(form.includes(marker),marker);
 // Descriptions and consent-gated booking remain in DOM, not deleted to pass geometry.
 for(const marker of ['data.shortText','data.longText','data.monthText','data.monthNote','<ContactChannelChooser'])
   assert.ok(form.includes(marker),marker);
});

test("320px phones taller than the short-screen breakpoint retain the compact booking controls", () => {
 const css=read("components/alchemy-soul-landing.module.css");
 const form=read("components/alchemy-soul-lead-form.tsx");
 assert.match(css, /@media\(max-width:350px\) and \(min-height:651px\)/);
 assert.match(css, /\.optionsSection>\.panelPhoto\{height:44px;margin-bottom:4px\}/);
 assert.match(css, /\.optionsSection \.optionCard\{padding:7px 6px\}/);
 assert.match(css, /\.optionsSection \.optionCard strong\{font-size:23px;margin-top:3px\}/);
 assert.match(css, /\.optionsSection \.formatMore summary\{display:flex;min-height:32px;padding-block:4px\}/);
 assert.match(css, /\.optionsSection \.optionsOrder\{margin-top:4px\}/);
 for(const marker of ['data-alchemy-format="30"','data-alchemy-format="60"','data-alchemy-format="month"','data-alchemy-format-details','data-alchemy-booking'])
   assert.ok(form.includes(marker),marker);
 assert.match(css, /\.optionsOrder :global\(\[data-contact-order\]\),\.formOrder :global\(\[data-contact-order\]\)\{min-height:46px/);
 assert.match(css, /\.paymentDisclosure summary\{[^}]*min-height:44px/);
});
