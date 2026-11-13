import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
// Run the new guest-first-video protections in existing Mandala fast CI.
import "./mandala-guest-first-video-flow.test.mjs";

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
  const order=["data-video-quick-builder",'<nav className={videoStyles.quickVideoNav} data-video-quick-controls',
    "data-video-quick-section=\"1\"","data-video-live-stage","data-video-mandala-hero",
    "data-video-mini-source","data-video-quick-live-preview",
    "data-video-therapy-banner",
    '<section className={videoStyles.quickSection} data-workspace-section="video" data-video-quick-section="4"',
    "data-video-quick-scene={quickStyleSceneIds[theme][index]}",
    "<section className={videoStyles.quickPhraseSection} data-workspace-section=\"phrases\" data-video-quick-phrases",
    "<section className={videoStyles.quickMusicSection} data-workspace-section=\"video\" data-video-quick-audio-choices",
    "data-video-scene-library",'id="video-templates"',"data-free-film-compilation-catalog",
    "data-video-quick-tier","data-video-practice-accordion",
    "data-video-quick-personal","data-video-quick-generate","data-video-quick-legacy",
    "data-video-quick-section=\"3\"","data-video-quick-section=\"5\"",
    "data-video-quick-section=\"6\""];
  // Walk the actual JSX source in forward order. A handler's earlier
  // querySelector("[data-free-film-compilation-catalog]") is not the markup.
  let cursor=0;
  for(let i=0;i<order.length;i++){
    const location=source.indexOf(order[i],cursor);
    assert.ok(location>=0,"video studio hierarchy changed at "+order[i]);
    cursor=location+order[i].length;
  }
  assert.match(source,/className=\{videoStyles.previewCoverOptions\} data-video-cover-options/);
  assert.match(source,/\{basicPanelTab==="photo" \? deepCharacterPhotoPane : null\}/);
  assert.match(source,/\{activeWorkspace==="video" \? deepCharacterPhotoPane : null\}/);
  assert.equal((source.match(/<details className=\{videoStyles\.previewCoverOptions\} data-video-cover-options/g)||[]).length,1,
    "the same original photo/consent widget is reused in basic settings");
  assert.match(source,/data-video-quick-section="7"/);
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
  const tier=source.slice(source.indexOf('data-video-quick-tier'),source.indexOf('data-video-quick-personal',source.indexOf('data-video-quick-tier')));
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
  const direct=source.slice(source.indexOf("data-video-quick-generate"),
    source.indexOf("</button>",source.indexOf("data-video-quick-generate")));
  const addEffects=source.slice(source.indexOf('data-video-montage-next={montagePanel==="effects"?"audio":montagePanel==="audio"?"text":montagePanel==="text"||montagePanel==="settings"?"concept":montagePanel==="concept"?"promo":"choose"}'),
    source.indexOf("</button>",source.indexOf('data-video-montage-next={montagePanel==="effects"?"audio":montagePanel==="audio"?"text":montagePanel==="text"||montagePanel==="settings"?"concept":montagePanel==="concept"?"promo":"choose"}')));
  assert.ok(direct.includes('onClick={createQuickVideo}'),"Create must use the original real renderer");
  assert.ok(addEffects.includes('onClick={continueMontageOrGenerate}'),"Add must only advance");
  assert.match(source,/if\(montagePanel==="audio"\)\{[\s\S]*?setMontagePanel\("text"\)/,
    "Audio Add returns to the existing affirmations editor");
  assert.doesNotMatch(addEffects,/createQuickVideo|videoCreditRequest|startFromHero/,
    "Add cannot generate or charge");
  for(const guard of ['if(!freeVideoSelected){','if(phrasePending){','if(narrationInvalid){','if(!canGenerate){'])
    assert.ok(source.includes(guard),"protected export gate: "+guard);
  assert.match(source,/prepareFourFilmSources\(freeFilmShots,freeFilmPlayerRefs\.current/,
    "Four local MP4s must prime on the trusted Create click");
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
  assert.match(s,/data-video-basic-editor/);
  const fifth=s.slice(s.indexOf('data-video-basic-editor'),s.indexOf('data-video-quick-personal'));
  assert.doesNotMatch(fifth,/data-video-goal-summary/,
    "goal was already supplied earlier; Montage must not ask it twice");
  const auto=read("components/mandala-auto-video-director.tsx");
  assert.match(s,/<MandalaAutoVideoDirector[\s\S]*?goal=\{wish\}/,
    "approved goal comes from the single local wish state");
  assert.match(auto,/data-auto-video-input value=\{requestDraft\}[\s\S]*?maxLength=\{160\}/,
    "the same personal goal retains its strict 160-character browser limit");
  assert.match(auto,/const text=event\.currentTarget\.value;[\s\S]*?onGoalChange\(nextGoal\)/,
    "typing updates the same local state and real source-backed proposal without remote upload");
  assert.match(s,/data-video-montage-tab=\{item.id\}/);
  assert.match(s,/data-video-voice-studio/);
  assert.match(s,/sourceText=\{currentAffirmationSpeech\}/,
    "phrases supply the existing shared narration source");
  assert.match(s,/setAffirmations\(/,
    "existing phrase controls remain functional outside the new basic settings");
  assert.match(s,/photoUrl&&!backgroundOnly&&!photoConsent/);
  assert.match(s,/if\(uploadedAudio&&!audioRights\)/);
  assert.match(s,/setNotice\(audioUi\.needsAttach\);\s*setActiveWorkspace\("editor"\);setMontagePanel\("audio"\);setBasicPanelTab\("music"\)/,
    "missing audio opens Montage Audio attachment and consent controls");
  assert.match(s,/if\(!activeFilm\)\{[\s\S]*?if\(previewPlaying\)\{stopMovieSound\(\);setPreviewPlaying\(false\);\}\s*else openAffirmationPreview\(\)/,
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
  assert.equal((result.slice(offer).match(/target="_blank" rel="noopener noreferrer"/g)||[]).length,2,
    "only the two optional service orders open separately");
  const preview=result.slice(0,offer);
  assert.match(preview,/<video ref=\{resultVideoRef\}[^>]*controls playsInline preload="auto"/,
    "a native decoded player is mounted without a guest sign-in wall");
  assert.match(preview,/data-video-guest-play/);
  assert.doesNotMatch(preview,/data-video-guest-signin|data-video-guest-check-session/);
  assert.match(preview,/\(!creditCatalog\?\.chargeRequired\|\|creditSession==="signed_in"\|\|result\.mode==="catalog"\) \? <>/,
    "Save, Share and delivery still require an authenticated account");
  for(const locale of ["ru","en","es"]){
    assert.match(source,new RegExp(locale+": \\{[\\s\\S]*?consultationAction:"));
  }
  assert.match(source,/30 минут · €50 или 60 минут · €100/);
  assert.match(source,/Заявка — не бронь и не оплата/);
  const handoff=result.slice(offer);
  assert.doesNotMatch(handoff,/\b(?:wish|photoUrl|meditationFocus|scores|affirmations)\b/,
    "private video inputs must never be sent in a service link");
  assert.match(result,/wish\.trim\(\)\.slice\(0,60\)/,
    "the goal label stays local beside the recording, never in any outbound link");
  assert.match(css,/\.postVideoSupportGrid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(max-width:759px\)\{[\s\S]*?\.postVideoSupportGrid\{grid-template-columns:minmax\(0,1fr\)/);
});


test("forty-eight curated free four-shot compilations use all 44 approved local video masters",()=>{
  const src=read("components/mandala-free-video-studio.tsx");
  const money=read("lib/mandala/real-money-film-library.ts");
  const themed=read("lib/mandala/film-collection-v2.ts");
  const taxonomy=JSON.parse(read("data/video-catalog/scene-taxonomy.json"));
  const additions=JSON.parse(read("data/video-catalog/free-film-presets-v2.json"));
  const officialExtras=JSON.parse(read("data/video-catalog/free-stock-scenes.json"));
  const start=src.indexOf("const FREE_FILM_PRESETS:");
  assert.ok(start>0,"catalog belongs in the existing approved video editor");
  const arrayStart=src.indexOf("= [",start)+2;
  const spread=src.indexOf("...(extraFreeFilmPresets.presets as FreeFilmPreset[])",arrayStart);
  assert.ok(spread>arrayStart,"new verified four-shot presets are reused, not copied");
  const originalPart=src.slice(arrayStart,spread).trim().replace(/,\s*$/,"");
  const original=JSON.parse(originalPart+"]");
  const catalogue=[...original,...additions.presets];
  assert.equal(original.length,24);
  assert.equal(additions.presets.length,25);
  assert.equal(catalogue.length,49);
  assert.equal(taxonomy.scenes.length,56);
  const physical=new Set(taxonomy.scenes.filter(item=>item.status==="approved").map(item=>item.id));
  assert.equal(physical.size,56);
  const groups=new Map(),ids=new Set(),originalClips=new Set();
  for(const film of catalogue){
    assert.ok(!ids.has(film.id),"every free montage has a distinct id");
    ids.add(film.id);
    assert.equal(film.clips.length,4);
    assert.equal(new Set(film.clips).size,4,"four different MP4 masters per film");
    for(const locale of ["ru","en","es"])assert.ok(film.label[locale]?.trim());
    groups.set(film.theme,(groups.get(film.theme)||0)+1);
    for(const clip of film.clips){
      assert.ok(physical.has(clip),"montage references only verified, licensed local MP4: "+clip);
      assert.ok(money.includes('"'+clip+'"') || money.includes('\n  '+clip+':') || themed.includes('film("'+clip+'")') ||
        officialExtras.some(item=>item.id===clip&&item.status==="approved"),
        "all video sources exist in the first-party playback registry: "+clip);
      originalClips.add(clip);
    }
  }
  for(const category of ["money","energy","life","health","relationships","goals"])
    assert.equal(groups.get(category),category==="energy"?9:8,category);
  assert.equal(originalClips.size,48,"44 existing source clips and 4 new landscape sunlight films appear in movies");
  const portraitSources=new Set([...originalClips,...additions.presets.flatMap(p=>p.portraitClips||[])]);
  assert.equal(portraitSources.size,56,"all aspect-specific film variants remain available");
  assert.ok([...portraitSources].every(id=>physical.has(id)));
  assert.equal(additions.presets.filter(p=>p.portraitClips).length,5);
  assert.match(src,/free-film-presets-v2\.json/);
  assert.match(src,/scene-taxonomy\.json/);
  assert.match(src,/data-free-film-compilation-catalog/);
  assert.match(src,/data-free-film-original-masters/);
  assert.match(src,/data-free-film-source=\{shot\.sceneId\}/);
  assert.match(src,/storyboard\.version===FREE_FILM_PLAN_VERSION\?stockShotVideo:null/);
  assert.match(src,/shot\.theme,shot\.sceneId as LocalSceneId,speed,brightness/);
  assert.match(src,/const canGenerate =[\s\S]*freeFilmSourcesListed/);
  assert.match(src,/if\(!\(await filmPreparation\)\)/,
    "a failed decoded-source check must never output a partial four-scene movie");
  assert.match(src,/allocateSourceBoundedFilmTimeline\(/,
    "Auto Director must respect verified clip durations before adaptive timing");
  assert.match(read("lib/mandala/free-film-timeline.mjs"),
    /const adaptive=allocateAdaptiveFilmTimeline\(/,
    "the same four-stage adaptive pacing stays active when physical sources fit");
  assert.match(src,/edit\?\.durationSecondsByStage\?\?null/,
    "explicit stage edits must be passed through to the same timing engine");
  assert.match(read("lib/mandala/free-film-timeline.mjs"),
    /export function allocateFreeFilmTimeline\(/,
    "the legacy equal-time allocator remains intact for other consumers");
  assert.match(src,/startSeconds:timing\.startSeconds,durationSeconds:timing\.durationSeconds/,
    "exported scene timing comes from the same timeline, not stale 10-second padding");
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
  assert.doesNotMatch(source,/data-video-quick-extras/,
    "removed duplicate PRO extras must not overlay the three-tier editor");
  const proTiers=read("components/mandala-pro-enhance.tsx");
  assert.match(proTiers,/data-video-pro-tiers/);
  assert.match(proTiers,/data-video-pro-standard-editor/);
  assert.match(proTiers,/data-video-pro-choose-character/);
  assert.match(source,/openQuickDetailed\("video-settings"\)/);
  assert.match(source,/openQuickDetailed\("video-audio"\)/);
  assert.match(css,/\.quickBrandBar\{display:none\}/);
  assert.match(css,/@media\(max-width:759px\)\{[\s\S]*?\.quickOrderBar\{position:static;/);
  assert.match(css,/@media\(max-width:379px\)\{[\s\S]*?\.quickFormatGrid\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(css,/\.quickBuilder \.quickThemeRail button\{min-height:112px/);
  const route=read("app/[locale]/holistic-support/mandala/page.tsx");
  assert.doesNotMatch(route,/data-video-diagnostic-banner|slimDiagnostic/,
    "the video workspace must not mount the unsolicited diagnostic promotion");
  assert.doesNotMatch(pageCss,/\.slimDiagnostic\{/,
    "removed promotion must not retain unused mobile rules");
  assert.match(css,/04 Nov owner visual recovery:[^\n]*ONE stable header/);
  const heroSegment=source.slice(source.indexOf("data-video-quick-hero-play"),
    source.indexOf('data-video-quick-section="1"'));
  assert.ok(heroSegment.length>0);
  assert.doesNotMatch(heroSegment,/new MediaRecorder|fetch\(/);
});
