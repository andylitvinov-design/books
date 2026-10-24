import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = p => readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Alchemy one-screen chapters preserve one visual each",()=>{
 const s=read("components/alchemy-soul-landing.tsx"),css=read("components/alchemy-soul-landing.module.css");
 const panels=[["featured-video","video","<SiteVideoPlayer"],["hero","photo","<StaticPortrait"],
 ["situations","photo","<Image"],["method","photo","<Image"],["video","video","<SiteVideoPlayer"],
 ["reviews","video","<SiteVideoPlayer"],["formats","photo","<Image"],["faq","photo","<Image"],["request","photo","<Image"]];
 for(let i=0;i<panels.length;i++){
  const [id,kind,media]=panels[i],at=s.indexOf('data-alchemy-panel="'+id+'" data-alchemy-visual="'+kind+'"');
  assert.ok(at>=0,id+" chapter missing");
  const end=i+1<panels.length?s.indexOf('data-alchemy-panel="'+panels[i+1][0]+'"',at+1):s.indexOf('<p className={styles.safety}>',at+1);
  assert.ok(s.slice(at,end>at?end:undefined).includes(media),id+" missing "+media);
 }
 for(const image of ["hero-olive-incense.webp","report-lighthouse-coast.webp","andy-about.png"])assert.ok(s.includes(image));
 assert.match(css,/100svh/);assert.match(css,/max-height:650px/);
});
test("Details, approved media, prices and contact flow remain reachable",()=>{
 const s=read("components/alchemy-soul-landing.tsx");
 for(const part of ['data-alchemy-details="introduction"','t.pains.slice(1)','t.steps.slice(1)','reviews.slice(0, 1)','reviews.slice(1)','youtubeId: "-zacUn_zN6g"','youtubeId: "IF0HAhSDwks"','<AlchemySoulFormatSelector','<ContactChannelChooser','t.safety'])assert.ok(s.includes(part),"Missing "+part);
 assert.equal((s.match(/<AlchemySoulLeadForm locale=\{locale\}/g)||[]).length,1);
 for(const locale of ["ru: {","en: {","es: {"])assert.ok(s.includes(locale));
});
