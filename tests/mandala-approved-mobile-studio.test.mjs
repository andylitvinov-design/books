import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("the approved native video editor uses one real local renderer and stable ordered mobile features",()=>{
  const source=read("components/mandala-free-video-studio.tsx");
  const page=read("app/[locale]/holistic-support/mandala/page.tsx");
  const app=read("components/mandala-meditation-client.tsx");
  const css=read("components/mandala-video-mobile.module.css");
  const pageCss=read("components/mandala-meditation.module.css");
  const dock=read("components/holistic-support-mandala-dock.tsx");
  const globalBanner=read("components/sitewide-antistress-banner.tsx");
  const supportCss=read("components/holistic-support-mobile.module.css");
  assert.equal((app.match(/<MandalaFreeVideoStudio /g)||[]).length,1);
  assert.equal((source.match(/ref=\{premiumVideoRef\}/g)||[]).length,1,
    "one original H264 film master feeds preview and recording");
  const order=["data-video-quick-builder","data-video-quick-section=\"1\"","data-video-quick-tier",
    "data-video-quick-live-preview","data-video-quick-scene","data-video-quick-section=\"4\"",
    "data-video-quick-personal","data-video-quick-generate","data-video-quick-legacy",
    "data-video-quick-section=\"3\"","data-video-quick-section=\"5\"","data-video-quick-section=\"6\""];
  for(let i=0;i<order.length;i++){
    assert.ok(source.includes(order[i]),"missing "+order[i]);
    if(i>0)assert.ok(source.indexOf(order[i])>source.indexOf(order[i-1]),
      "mobile hierarchy changed at "+order[i]);
  }
  assert.ok(page.indexOf("<HolisticSupportMandalaDock")<
    page.indexOf("<MandalaMeditationClient"),"header must render above editor");
  assert.match(pageCss,/@media\(max-width:759px\)\{\.slimDiagnostic\{display:none\}\}/);
  assert.ok(globalBanner.includes("holistic-support") && globalBanner.includes("(?:mobile|mandala)"),
    "the sitewide promo must be hidden for the canonical video editor");
  assert.ok(supportCss.includes("@media(min-width:641px){.mandalaAppHeader{display:none}}"),
    "the app header must not duplicate the desktop header on tablets");
  assert.match(dock,/<Leaf size=\{24\}/);
  assert.match(css,/\.quickGenerate\{position:sticky/);
  assert.match(css,/bottom:calc\(76px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(source,/data-mandala-master-mp4=\{activeFilm\.src\}/);
  assert.match(source,/data-video-quick-scene=\{scene\.id\}/);
  assert.match(source,/if\(theme==="money"\)setMoneyScene\(scene\.id as MoneySceneId\)/);
  assert.match(source,/else setOtherScene\(scene\.id as LocalSceneId\)/);
});

test("three formats are honest and cannot trigger unverified billing/provider credits",()=>{
  const source=read("components/mandala-free-video-studio.tsx");
  const tier=source.slice(source.indexOf('data-video-quick-tier'),source.indexOf('data-video-quick-section="2"'));
  assert.match(tier,/data-video-tier="free" aria-pressed="true"/);
  assert.match(tier,/data-video-tier="smart" aria-disabled="true"/);
  assert.match(tier,/data-video-tier="pro" aria-disabled="true"/);
  assert.doesNotMatch(tier,/(?:balance|purchase|checkout|pay|wallet|credit)[A-Za-z]*\s*\(/i,
    "no fake charge or credit debit");
  for(const locale of ["ru","en","es"]){
    assert.match(source,new RegExp(locale+": \\{[\\s\\S]*?unavailable:"));
  }
  assert.match(source,/noAI:"Бесплатно/);
  assert.match(source,/getThemedRealFilm\(value,quickStyleSceneIds\[value\]\[0\]/);
});

test("privacy, local goal and experimental efficacy note remain enforced",()=>{
  const s=read("components/mandala-free-video-studio.tsx");
  const script=read("scripts/verify-holistic-mandala-browser.mjs");
  assert.match(s,/data-video-quick-wish/);
  assert.match(s,/maxLength=\{160\} value=\{wish\}/);
  assert.match(s,/data-video-personal-affirmations/);
  assert.match(s,/enabled:!current\.enabled/);
  assert.match(s,/photoUrl&&!backgroundOnly&&!photoConsent/);
  assert.match(s,/if\(uploadedAudio&&!audioRights\)/);
  assert.match(s,/data-video-photo-consent/);
  assert.match(s,/Краткие кадры и гипноаффирмации — экспериментальные/);
  assert.match(s,/25th frame|25th|Brief frames and hypnoaffirmations/);
  assert.match(script,/approved-studio\.png/);
  assert.match(script,/touchTargets\.every\(rect=>rect\.width>=44&&rect\.height>=44\)/);
  assert.match(script,/data-mandala-video-generate/);
  assert.match(script,/ffprobe|ffmpeg/);
});
