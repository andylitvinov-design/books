import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("the existing public editor retains one real video renderer and the new compact builder",()=>{
  const source=read("components/mandala-free-video-studio.tsx");
  const page=read("app/[locale]/holistic-support/mandala/page.tsx");
  const app=read("components/mandala-meditation-client.tsx");
  const css=read("components/mandala-video-mobile.module.css");
  assert.equal((app.match(/<MandalaFreeVideoStudio /g)||[]).length,1,
    "modify the original editor, not a duplicate");
  assert.equal((source.match(/ref=\{premiumVideoRef\}/g)||[]).length,1,
    "one original H264 film master feeds preview and recording");
  assert.match(page, /<MandalaMeditationClient/,"canonical Mandala route must mount this editor");
  const order=["data-video-quick-builder","data-video-quick-section=\"1\"",
    "data-video-live-stage","data-video-mandala-hero","data-video-quick-controls",
    "data-video-mini-source","data-video-quick-live-preview",
    "data-video-therapy-banner",
    '<section className={videoStyles.quickSection} data-video-quick-section="4"',
    "data-video-quick-scene={quickStyleSceneIds[theme][index]}",
    "<section className={videoStyles.quickPhraseSection} data-video-quick-phrases",
    "<section className={videoStyles.quickMusicSection} data-video-quick-audio-choices",
    "data-video-scene-library",'id="video-templates"',"data-free-film-compilation-catalog",
    "className={videoStyles.previewCoverOptions} data-video-cover-options","data-video-quick-section=\"7\"",
    "data-video-quick-tier","data-video-practice-accordion",
    "data-video-quick-personal","data-video-quick-generate","data-video-quick-legacy",
    "data-video-quick-section=\"3\"","data-video-quick-section=\"5\"",
    "data-video-quick-section=\"6\""];
  for(let i=0;i<order.length;i++){
    assert.ok(source.includes(order[i]),"missing "+order[i]);
    if(i>0)assert.ok(source.indexOf(order[i])>source.indexOf(order[i-1]),
      "video studio hierarchy changed at "+order[i]);
  }
  assert.match(css,/\.quickOrderBar\{position:sticky/);
  assert.match(css,/bottom:calc\(76px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css,/\.quickOrderBar\{position:static;bottom:auto/,
    "mobile order bar must not obscure the large player or scene controls");
  assert.match(source,/data-mandala-master-mp4=\{activeFilm\.src\}/);
  assert.match(source,/data-video-quick-scene=\{scene\.id\}/);
  assert.match(source,/if\(theme==="money"\)setMoneyScene\(scene\.id as MoneySceneId\)/);
  assert.match(source,/else setOtherScene\(scene\.id as LocalSceneId\)/);
});

test("shared widescreen preview and mutually exclusive format accordion keep paid formats gated",()=>{
  const source=read("components/mandala-free-video-studio.tsx");
  const css=read("components/mandala-video-mobile.module.css");
  const stage=source.slice(source.indexOf('data-video-live-stage'),source.indexOf('data-video-quick-tier'));
  const tier=source.slice(source.indexOf('data-video-quick-tier'),source.indexOf('data-video-quick-personal'));
  assert.match(stage,/data-video-mandala-hero/);
  assert.match(stage,/data-mandala-cinematic-canvas/);
  assert.match(stage,/data-video-quick-live-preview/);
  assert.equal((source.match(/data-video-quick-live-preview/g)||[]).length,1,
    "one real source MP4 is the miniature below the one Canvas stage");
  assert.match(stage,/data-video-scene-library[\s\S]*?id="video-templates"[\s\S]*?data-free-film-compilation-catalog/);
  assert.doesNotMatch(tier,/data-video-quick-live-preview/,
    "the format section is now the full-width accordion below the media library");
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
  assert.match(source,/disabled=\{recording\|\|preparing\|\|!freeVideoSelected\|\|\(usingFreeFilmCompilation&&!freeFilmReady\)\}/,
    "free video is gated until all four genuine stock clips are ready");
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
  assert.match(s,/if\(!activeFilm\)\{[\s\S]*?if\(previewPlaying\)setPreviewPlaying\(false\);\s*else openAffirmationPreview\(\)/,
    "Canvas-only topics must play the visible main screen without expanding the editor");
  assert.match(s,/const coverOptions=document\.querySelector<HTMLDetailsElement>\("\[data-video-cover-options\]"\)/,
    "photo-rights consent must open the relocated disclosure");
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


test("twenty-four unique first-party four-shot free compilations use verified stock masters, not paid AI",()=>{
  const src=read("components/mandala-free-video-studio.tsx");
  const money=read("lib/mandala/real-money-film-library.ts");
  const themed=read("lib/mandala/film-collection-v2.ts");
  const start=src.indexOf("const FREE_FILM_PRESETS:");
  assert.ok(start>0,"catalog belongs in the existing approved video editor");
  const arrayStart=src.indexOf("= [",start)+2;
  const arrayEnd=src.indexOf("] as const;",arrayStart)+1;
  const catalogue=JSON.parse(src.slice(arrayStart,arrayEnd));
  assert.equal(catalogue.length,24);
  const groups=new Map();
  const ids=new Set();
  const originalClips=new Set();
  for(const film of catalogue){
    assert.ok(!ids.has(film.id),"every free montage has a distinct id");
    ids.add(film.id);
    assert.equal(film.clips.length,4);
    assert.equal(new Set(film.clips).size,4,"four different MP4 masters per film");
    for(const locale of ["ru","en","es"])assert.ok(film.label[locale]?.trim());
    groups.set(film.theme,(groups.get(film.theme)||0)+1);
    for(const clip of film.clips){
      assert.ok(money.includes('"'+clip+'"') || money.includes(clip+': {src:ROOT+"'+clip+'.mp4"') || themed.includes('film("'+clip+'")'),
        "every storyboard clip exists as a pre-encoded first-party MP4: "+clip);
      originalClips.add(clip);
    }
  }
  for(const category of ["money","energy","life","health","relationships","goals"])
    assert.equal(groups.get(category),4,category);
  assert.ok(originalClips.size>=24,"montages must vary across many actual videos");
  assert.match(src,/data-free-film-compilation-catalog/);
  assert.match(src,/data-free-film-original-masters/);
  assert.match(src,/data-free-film-source=\{shot\.sceneId\}/);
  assert.match(src,/if\(storyboard\?\.version===FREE_FILM_PLAN_VERSION\)/);
  assert.match(src,/selected\.theme,selected\.sceneId as LocalSceneId,speed,brightness,stockShotVideo\)/);
  assert.match(src,/const canGenerate =[\s\S]*freeFilmReady/);
  assert.match(src,/durationSeconds===10\?20:durationSeconds/);
  assert.match(src,/startSeconds:start,durationSeconds:shotLength/);
  assert.match(src,/providerPrompt:""/);
  assert.match(src,/new MediaRecorder\(stream/);
  assert.doesNotMatch(src.slice(start,src.indexOf("const effects:",start)),
    /https?:\/\/|\bfetch\s*\(|\baxios\b|\bcheckout\b|\bapiKey\b/i,
    "catalogue must not load external stock, spend credits or upload client inputs");
});


test("approved compact iPhone hierarchy has one working hero Play, safe extras and no overlay",()=>{
  const source=read("components/mandala-free-video-studio.tsx");
  const css=read("components/mandala-video-mobile.module.css");
  const pageCss=read("components/mandala-meditation.module.css");
  assert.equal((source.match(/data-video-quick-hero-play/g)||[]).length,1);
  assert.match(source,/data-video-quick-hero-play[\s\S]*?onClick=\{\(\)=>\{[\s\S]*?openAffirmationPreview\(\)/,
    "header Play must use the same real player callback as the main canvas");
  assert.match(source,/const openAffirmationPreview = \(\) => \{[\s\S]*?setPreviewPlaying\(true\);[\s\S]*?const film = premiumVideoRef\.current/,
    "one gesture begins the original Canvas + same-origin MP4 playback");
  assert.doesNotMatch(source,/video\.play\(\)\.then\(\(\)=>setPreviewPlaying\(true\)\)/,
    "WebKit cannot defer playback UI state until a media promise resolves");
  assert.match(source,/data-video-quick-extras/);
  assert.match(source,/openQuickDetailed\("video-settings"\)/);
  assert.match(source,/openQuickDetailed\("video-audio"\)/);
  assert.match(css,/\.quickBrandBar\{display:none\}/);
  assert.match(css,/@media\(max-width:759px\)\{[\s\S]*?\.quickOrderBar\{position:static;/);
  assert.match(css,/@media\(max-width:379px\)\{[\s\S]*?\.quickFormatGrid\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(css,/\.quickBuilder \.quickThemeRail button\{min-height:112px/);
  assert.match(css,/:global\(\[data-mandala-meditation-page\]\):has\(\.studio\) :global\(\[data-video-diagnostic-banner\]\)\{display:none\}/);
  assert.doesNotMatch(pageCss,/@media\(max-width:640px\)\{\.slimDiagnostic\{display:none\}\}/);
  const heroSegment=source.slice(source.indexOf("data-video-quick-hero-play"),
    source.indexOf('data-video-quick-section="1"'));
  assert.ok(heroSegment.length>0);
  assert.doesNotMatch(heroSegment,/new MediaRecorder|fetch\(/);
});

test("phrases and hypnocorrection button expands one shared editor below six video tabs",()=>{
 const src=read("components/mandala-free-video-studio.tsx");
 const css=read("components/mandala-video-mobile.module.css");
 const hypno=read("components/mandala-hypno-compact.tsx");
 assert.match(src,/id:"phrases",label:\{ru:"Фразы и гипнокоррекция"/);
 assert.match(src,/aria-expanded=\{item.id==="phrases"\?quickHypnoOpen:undefined\}/);
 assert.match(src,/if\(item.id==="phrases"\)\{[\s\S]*?setQuickHypnoOpen/);
 assert.ok(src.indexOf("data-video-quick-controls")<src.indexOf("data-video-quick-hypno-panel"));
 assert.ok(src.indexOf("data-video-quick-hypno-panel")<src.indexOf("data-video-mini-source"));
 assert.equal((src.match(/<MandalaHypnoCompact /g)||[]).length,1);
 assert.equal((src.match(/id="video-hypnosis"/g)||[]).length,1);
 assert.match(src,/data-video-quick-hypno-panel hidden=\{!quickHypnoOpen\}/);
 assert.match(src,/onChange=\{setAffirmations\}/);
 assert.match(src,/onPreview=\{openAffirmationPreview\}/);
 assert.match(src,/onCreate=\{startFromHero\}/);
 assert.match(css,/\.quickHypnoInline\[hidden\]\{display:none\}/);
 assert.match(hypno,/data-hypno-suggest-tests/);
 assert.match(hypno,/data-hypno-filter-tone/);
 assert.match(hypno,/data-hypno-approve/);
});
