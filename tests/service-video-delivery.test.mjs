import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("all approved service videos reuse exactly reviewed EN/RU sources, never generated or Drive links", () => {
  const registry = read("data/service-video-library.ts");
  for (const id of ["s30Y42IwPcg", "Cz6SxXJNZbw", "ILyRWyHtJoE", "Q9NvYECKWuc",
    "8c1634ce904434a91931429b6a7eefe1", "7c6b243f048b9c0581ae29619a4a89fc"]) {
    assert.ok(registry.includes(id), "missing original approved media " + id);
  }
  assert.match(registry, /siteVideoWatchUrl/);
  assert.match(registry, /locale === "es" \? "en" : locale/);
  assert.match(registry, /general: true/);
  assert.doesNotMatch(registry, /drive\.google\.com|private|clientId|api[_-]?key|autoplay/);
  for (const poster of ["services-en-v2.webp", "services-ru-v1.webp", "constellations-en-v1.webp",
    "hypnotherapy-en-v1.webp", "homeopathy-en-v2.webp", "homeopathy-ru-v1.webp"]) {
    const path = "public/images/holistic-house/video-posters/" + poster;
    assert.ok(existsSync(new URL("../" + path, import.meta.url)), path);
    const magic = readFileSync(new URL("../" + path, import.meta.url)).subarray(0, 12);
    assert.equal(magic.toString("ascii", 0, 4), "RIFF");
    assert.equal(magic.toString("ascii", 8, 12), "WEBP");
  }
});

test("the requested psychotherapy YouTube video is limited to RU service media", () => {
  const registry = read("data/service-video-library.ts");
  const showcase = read("components/service-video-showcase.tsx");
  const landing = read("components/personal-service-landing.tsx");
  const ruVideo = registry.match(/const hypnotherapyRu: ServiceVideoMedia = \{[\s\S]*?\n\};/);
  const enVideo = registry.match(/const hypnotherapyEn: ServiceVideoMedia = \{[\s\S]*?\n\};/);
  assert.ok(ruVideo, "Russian psychotherapy media must be defined");
  assert.ok(enVideo, "English psychotherapy media must remain defined");
  assert.match(ruVideo[0], /youtubeId: "eLsjFaKCBhI", language: "ru"/);
  assert.match(ruVideo[0], /general: false/);
  assert.doesNotMatch(enVideo[0], /eLsjFaKCBhI/);
  assert.match(registry, /ru: \{[\s\S]*?hypnotherapy: hypnotherapyRu,/);
  assert.match(registry, /en: \{[\s\S]*?hypnotherapy: hypnotherapyEn,/);
  assert.match(registry, /return media\[locale === "es" \? "en" : locale\]\[topic\]/);
  assert.match(landing, /service === "imagery-therapy" \? "hypnotherapy"/);
  assert.match(showcase, /heading: "Образная психотерапия — видео о подходе"/);
});

function assertServicePageOrder(source, expectedLocale='locale as Locale') {
  const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal(ast.parseDiagnostics.length, 0);
  const component = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword));
  const returned = component?.body?.statements.find(ts.isReturnStatement)?.expression;
  assert.ok(returned, 'Default page return is required');
  const nodes=[];
  const visit=n=>{if(ts.isJsxSelfClosingElement(n)||ts.isJsxOpeningElement(n))nodes.push(n);ts.forEachChild(n,visit)};
  visit(returned);
  // #1153 moved complete sections, #1393 retained open method posters.
  const order=['PublicConsultationCta','ServicesStudioOffers','ServicesIntroMedia','PersonalTestimonials','ServicesMethodVideos','ServicesDirectoryInvitation'];
  const attr=(node,name)=>node.attributes.properties.find(p=>ts.isJsxAttribute(p)&&p.name.text===name)?.initializer;
  const tags=nodes.map(n=>n.tagName.getText(ast));
  for(const tag of order){
    const found=nodes.filter(n=>n.tagName.getText(ast)===tag);assert.equal(found.length,1,'Exactly one '+tag);
    const locale=attr(found[0],'locale');
    assert.equal(expectedLocale==='es'?locale?.text:locale?.expression?.getText(ast),expectedLocale,'Correct locale for '+tag);
    if(tag==='PersonalTestimonials')assert.equal(attr(found[0],'variant')?.text,'services');
  }
  assert.deepEqual(tags.filter(tag=>order.includes(tag)),order);
}
function renderStudioMedia(name,locale){
  const element=(type,props)=>{assert.equal(typeof type,'string','Undefined JSX boundary');return {type,props:props||{}}};
  const imports={
    'react/jsx-runtime':{jsx:element,jsxs:element,Fragment:'fragment'},
    'next/link':{default:'a'},'lucide-react':{ArrowRight:'icon-arrow',ChevronDown:'icon-chevron',PlayCircle:'icon-play'},
    '@/components/page-video':{PageVideo:'page-video'},
    '@/components/services-about-entry':{ServicesAboutEntry:'about'},
    '@/components/service-video-showcase':{ServiceVideoShowcase:'showcase'},
    './services-studio-extras.module.css':{default:{}},
  };
  const moduleValue={exports:{}};
  vm.runInNewContext(ts.transpileModule(read('components/services-studio-extras.tsx'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
    module:moduleValue,exports:moduleValue.exports,require:id=>{assert.ok(Object.hasOwn(imports,id),'Unexpected studio dependency: '+id);return imports[id]},
  });
  const nodes=[];
  const visit=(node,parents=[])=>{if(Array.isArray(node))return node.forEach(n=>visit(n,parents));if(!node||typeof node!=='object'||!('type'in node))return;nodes.push({...node,parents});visit(node.props.children,[...parents,node])};
  visit(moduleValue.exports[name]({locale}));return nodes;
}
test("Services source keeps consultation first, then offers → intro → testimonials → open methods → directory in EN/RU/ES", () => {
  assertServicePageOrder(read('app/[locale]/services/page.tsx'));
  assertServicePageOrder(read('app/es/services/page.tsx'),'es');
  const browser=read('scripts/verify-site-video-browser.mjs');
  assert.match(browser,/getAttribute\('open'\) === null/);
});
for(const locale of ['en','ru','es'])test(`${locale} actual studio sections retain visible original method slots and separate closed archive`,()=>{
  const intro=renderStudioMedia('ServicesIntroMedia',locale);
  assert.equal(intro.find(n=>n.type==='section').props.id,'meet-andrey');
  const introVideo=intro.find(n=>n.type===(locale==='es'?'showcase':'page-video'));
  assert.equal(introVideo.props.locale,locale);
  assert.equal(locale==='es'?introVideo.props.topic:introVideo.props.slot,locale==='es'?'overview':'services-intro');
  const nodes=renderStudioMedia('ServicesMethodVideos',locale);
  const gallery=nodes.find(n=>n.type==='details'&&n.props.id==='method-videos');
  assert.ok(gallery);assert.equal(gallery.props.open,true);assert.equal(gallery.props.lang,locale);
  const videos=nodes.filter(n=>n.type===(locale==='es'?'showcase':'page-video'));
  const primary=videos.filter(n=>!n.parents.some(p=>p.type==='details'&&p.props.id!=='method-videos'));
  assert.deepEqual(primary.map(n=>locale==='es'?n.props.topic:n.props.slot),locale==='es'?['hypnotherapy','constellations']:['method-hypnotherapy','method-constellations']);
  assert.ok(primary.every(n=>n.props.locale===locale));
  if(locale!=='es'){
    const archive=nodes.filter(n=>n.type==='details'&&n.props.id!=='method-videos');
    assert.equal(archive.length,1);assert.equal(archive[0].props.open,undefined);
    assert.deepEqual(videos.filter(n=>n.parents.some(p=>p.type==='details'&&p.props.id!=='method-videos')).map(n=>n.props.slot),['service-business','service-alchemy','service-archetypal','consultation']);
  }
  assert.ok(!nodes.some(n=>n.type==='iframe'),'No eager third-party frame at section boundary');
});
test('Services section contract detects missing, duplicated, reordered and mislocalized sections',()=>{
  const page=read('app/[locale]/services/page.tsx');
  const tag='<ServicesMethodVideos locale={locale as Locale} />';
  for(const changed of [page.replace(tag,''),page.replace(tag,tag+tag),page.replace(tag,'').replace('<ServicesStudioOffers',tag+'<ServicesStudioOffers'),
    page.replace('<PersonalTestimonials locale={locale as Locale}', '<PersonalTestimonials locale="en"'),
    page.replace('<PersonalTestimonials locale={locale as Locale}', '<PersonalTestimonials'),
    page.replace('variant="services"','variant="home"')]){
    assert.notEqual(changed,page);assert.throws(()=>assertServicePageOrder(changed));
  }
});

test("Services cards keep exact method media accessible on-page with transcript if the HeyGen player fails", () => {
  const cards = read("components/services-solutions.tsx");
  const css = read("components/services-solutions.module.css");
  assert.match(cards, /getServiceVideoWatchUrl\(offer\.id, locale\)/);
  assert.match(cards, /data-service-card-video=\{offer\.id\}/);
  assert.match(cards, /locale === "ru" \? getServiceVideoWatchUrl\(offer\.id, locale\) :/);
  assert.match(cards, /\$\{offer\.href\}#service-video/);
  assert.match(cards, /Video & transcript/);
  assert.match(cards, /target=\{locale === "ru" \? "_blank" : undefined\}/);
  assert.match(cards, /isHome \? homepageMedia\[offer\.id\] : offer\.image/);
  assert.match(css, /\.cardVideo/);
  assert.match(css, /\.card\{position:relative/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.doesNotMatch(cards, /<iframe/);
});

test("the dedicated video appears on every service detail, with accurate EN/RU/ES language and disclosure", () => {
  const showcase = read("components/service-video-showcase.tsx");
  const css = read("components/service-video-showcase.module.css");
  const core = read("components/core-service-detail.tsx");
  const personal = read("components/personal-service-landing.tsx");
  const free = read("components/free-entry-landing.tsx");
  assert.match(core, /<ServiceVideoShowcase topic=\{kind === "dao" \? "overview" : kind\} locale=\{locale\} id="service-video"/);
  assert.match(personal, /<ServiceVideoShowcase/);
  assert.match(personal, /service === "psychohomeopathy" \? "homeopathy"/);
  assert.match(personal, /service === "imagery-therapy" \? "hypnotherapy"/);
  assert.match(free, /<SiteVideoPlayer video=\{situationVideo\.video\}/);
  assert.match(free, /getServiceVideoMedia\("constellation-case", locale\)/);
  assert.match(showcase, /<SiteVideoPlayer video=\{video\.video\} locale=\{locale\}/);
  assert.match(showcase, /textLanguage=\{video\.video\.language\}/);
  assert.match(showcase, /data-video-kind=\{video\.general \? "general" : "method"\}/);
  assert.match(showcase, /"Vídeo · audio en inglés"/);
  assert.match(showcase, /Отдельного русскоязычного ролика/);
  assert.match(showcase, /не заменяющей медицинскую помощь/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-width: 767px\)/);
});

test("six identity-verified public intro videos use YouTube on Play while retaining original HeyGen source", () => {
  const player = read("components/site-video-player.tsx");
  const minimal = read("components/site-video-minimal.module.css");
  for (const id of ["Y4K4piEwwA8", "s30Y42IwPcg", "ILyRWyHtJoE", "AE8Pelpo424", "Cz6SxXJNZbw", "Q9NvYECKWuc"]) {
    assert.ok(player.includes(id), "published mirror not accessible: " + id);
  }
  assert.match(player, /existingYouTubeMirrors/);
  assert.ok(player.includes("{mirrorLink && <div className={styles.quickWatch}>{mirrorLink}</div>}"));
  assert.match(player, /const playbackYouTubeId = mirrorId \|\| video\.youtubeId/);
  assert.match(player, /youtube-nocookie\.com\/embed\/\$\{playbackYouTubeId\}/);
  assert.match(player, /https:\/\/app\.heygen\.com\/embeds\//);
  assert.match(player, /data-video-playback=\{playbackYouTubeId \? "youtube" : "heygen"\}/);
  assert.match(player, /!playbackYouTubeId && showRecovery/);
  assert.match(player, /data-video-recovery="heygen"/);
  assert.match(player, /transcriptRef\.current\.open = true/);
  assert.match(minimal, /\.quickWatch/);
  assert.match(minimal, /\.recovery/);
});

test("method showcases expose direct original HeyGen fallback and release tests handle open galleries", () => {
  const showcase = read("components/service-video-showcase.tsx");
  const css = read("components/service-video-showcase.module.css");
  const verifier = read("scripts/verify-page-video-release.mjs");
  assert.ok(showcase.includes("siteVideoWatchUrl(video.video)"));
  assert.ok(showcase.includes("className={styles.original}"));
  assert.ok(showcase.includes('target="_blank" rel="noopener noreferrer"'));
  assert.ok(css.includes(".original:focus-visible"));
  assert.ok(verifier.includes("disclosure.getAttribute('open') === null"));
});
