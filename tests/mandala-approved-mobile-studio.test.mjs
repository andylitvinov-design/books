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
    "data-video-quick-live-preview","data-video-quick-section=\"4\"",
    "data-video-quick-scene={quickStyleSceneIds[theme][index]}",
    "data-video-quick-personal","data-video-quick-generate","data-video-quick-legacy",
    "data-video-quick-section=\"7\"","data-video-quick-section=\"3\"",
    "data-video-quick-section=\"5\"","data-video-quick-section=\"6\""];
  for(let i=0;i<order.length;i++){
    assert.ok(source.includes(order[i]),"missing "+order[i]);
    if(i>0)assert.ok(source.indexOf(order[i])>source.indexOf(order[i-1]),
      "mobile hierarchy changed at "+order[i]);
  }
  assert.ok(page.indexOf("<HolisticSupportMandalaDock")<
    page.indexOf("<MandalaMeditationClient"),"header must render above editor");
  assert.match(pageCss,/@media\(max-width:759px\)\{\.slimDiagnostic\{display:none\}\}/);
  assert.ok(globalBanner.includes("holistic-support") && globalBanner.includes("mandala(?:") && globalBanner.includes("mobile(?:"),
    "the sitewide promo must be hidden for the canonical video editor");
  assert.ok(supportCss.includes("@media(min-width:641px){.mandalaAppHeader{display:none}}"),
    "the app header must not duplicate the desktop header on tablets");
  assert.match(dock,/<Leaf size=\{24\}/);
  assert.match(css,/\.quickOrderBar\{position:sticky/);
  assert.match(css,/bottom:calc\(76px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(source,/data-mandala-master-mp4=\{activeFilm\.src\}/);
  assert.match(source,/data-video-quick-scene=\{scene\.id\}/);
  assert.match(source,/if\(theme==="money"\)setMoneyScene\(scene\.id as MoneySceneId\)/);
  assert.match(source,/else setOtherScene\(scene\.id as LocalSceneId\)/);
});

test("shared widescreen preview and mutually exclusive format accordion keep paid formats gated",()=>{
  const source=read("components/mandala-free-video-studio.tsx");
  const css=read("components/mandala-video-mobile.module.css");
  const tier=source.slice(source.indexOf('data-video-quick-tier'),source.indexOf('data-video-quick-section="4"'));
  assert.match(tier,/data-video-quick-live-preview/);
  assert.equal((tier.match(/data-video-quick-live-preview/g)||[]).length,1,
    "only one first-party video is displayed to the left");
  assert.match(tier,/data-video-practice-accordion/);
  assert.match(tier,/formatPracticeOrder\.map\(format=>/);
  assert.match(tier,/data-video-practice-card=\{format\}/);
  assert.match(tier,/data-video-practice-pick=\{format\}/);
  assert.match(tier,/data-video-practice-details=\{format\}/);
  assert.match(tier,/aria-expanded=\{selected\}/);
  assert.match(tier,/hidden=\{!selected\}/,
    "only the active format can reveal its detailed benefits and tiers");
  assert.match(tier,/aria-controls=\{"video-practice-details-"/);
  assert.match(tier,/formatQualityOrder\.map\(level=>/);
  assert.match(tier,/data-video-quality-option=\{format\+"-"\+level\}/);
  assert.match(tier,/draftFormatPrices\[format\]\[practiceLevels\[format\]\]/);
  assert.match(source,/data-video-price-summary aria-live="polite"/);
  assert.match(source,/selectedDraftPrice=draftFormatPrices\[practiceType\]\[practiceLevels\[practiceType\]\]/);
  assert.match(source,/video:\{basic:0,smart:2,pro:9\.90\}/);
  assert.match(source,/meditation:\{basic:2\.90,smart:4\.90,pro:null\}/);
  assert.match(source,/course:\{basic:19\.90,smart:null,pro:39\}/);
  assert.match(source,/freeVideoSelected = practiceType==="video" && practiceLevels\.video==="basic"/);
  assert.match(source,/disabled=\{recording\|\|preparing\|\|!freeVideoSelected\}/);
  assert.match(css,/\.quickFormatDemo\{[\s\S]*?aspect-ratio:16\/9/);
  assert.match(css,/\.quickFormatDetails\[hidden\]\{display:none\}/);
  assert.match(css,/\.quickFormatCard\[data-selected="true"\]\{[\s\S]*?box-shadow:/);
  assert.match(css,/@media\(max-width:355px\)/);
  assert.doesNotMatch(tier,/data-video-demo-preview/,"one preview, not three duplicated players");
  assert.doesNotMatch(tier,/(?:purchase|checkout|wallet|debit|spend)[A-Za-z]*\s*\(/i,
    "no unverified provider calls or balance mutations from preview cards");
  for(const locale of ["ru","en","es"]){
    assert.match(source,new RegExp(locale+": \\{[\\s\\S]*?unavailable:"));
    assert.match(source,new RegExp(locale+": \\{[\\s\\S]*?pending:"));
  }
  assert.match(source,/noAI:"Бесплатно/);
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
  assert.match(s,/setNotice\(audioUi\.needsAttach\);\s*\/\/ Audio controls[\s\S]*?openQuickDetailed\("video-audio"\)/,
    "selected sound must reveal real attachment controls after mobile collapse");
  assert.match(s,/if\(!activeFilm\)\{[\s\S]*?setPreviewPlaying\(current=>!current\);\s*if\(!previewPlaying\)openQuickDetailed\("video-hero"\)/,
    "Canvas-only topics must start the true animated preview on the first tap");
  assert.match(s,/data-video-photo-consent/);
  assert.match(s,/Краткие кадры и гипноаффирмации — экспериментальные/);
  assert.match(s,/25th frame|25th|Brief frames and hypnoaffirmations/);
  assert.match(script,/approved-studio\.png/);
  assert.match(script,/touchTargets\.every\(rect=>rect\.width>=44&&rect\.height>=44\)/);
  assert.match(script,/data-mandala-video-generate/);
  assert.match(script,/ffprobe|ffmpeg/);
});


test("selected money MP4 is requested and retried after Safari decoding without autoplaying other cards",()=>{
  const src=read("components/mandala-free-video-studio.tsx");
  assert.match(src,/autoPlay=\{playing&&visible\}/);
  assert.match(src,/preload=\{playing&&visible\?"auto":"none"\}/);
  assert.match(src,/if\(video\.readyState<2\)video\.load\(\)/);
  assert.match(src,/onCanPlay=\{event=>\{/);
  assert.match(src,/data-real-mp4=\{film\.src\}/);
});


test("post-generation human handoff is optional, privacy-safe and uses existing service journeys",()=>{
  const source=read("components/mandala-free-video-studio.tsx");
  const css=read("components/mandala-video-mobile.module.css");
  const resultStart=source.indexOf('data-video-result hidden={!result}');
  const resultEnd=source.indexOf('):<p>{ui.myVideosInfo}</p>}',resultStart);
  assert.ok(resultStart>0&&resultEnd>resultStart,"offers must live within real video result");
  const result=source.slice(resultStart,resultEnd);
  const save=result.indexOf('data-mandala-video-download');
  const share=result.indexOf('data-video-share');
  const offer=result.indexOf('data-video-post-generation-offers');
  assert.ok(save>0&&share>save&&offer>share,
    "Save and Share must precede any post-generation offer");
  assert.equal((result.match(/data-video-upsell-action=/g)||[]).length,2);
  assert.match(result,/href=\{"\/"\+locale\+"\/services#consultation"\}/);
  assert.match(result,/href=\{"\/"\+locale\+"\/services\/remote-energy-support"\}/);
  assert.equal((result.match(/target="_blank" rel="noopener noreferrer"/g)||[]).length,2,
    "open optional orders separately so unsaved local video is not lost");
  for(const locale of ["ru","en","es"]){
    assert.match(source,new RegExp(locale+": \\{[\\s\\S]*?consultationAction:"));
  }
  assert.match(source,/30 минут · €50 или 60 минут · €100/);
  assert.match(source,/Заявка — не бронь и не оплата/);
  assert.doesNotMatch(result,/\b(?:wish|photoUrl|meditationFocus|scores|affirmations)\b/,
    "private video inputs must never be sent in a service link");
  assert.match(css,/\.postVideoSupportGrid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(max-width:759px\)\{[\s\S]*?\.postVideoSupportGrid\{grid-template-columns:minmax\(0,1fr\)/);
});
