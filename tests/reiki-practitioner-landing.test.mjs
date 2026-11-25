import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
test("Reiki landing promotes free Daybook, preserves classic course and links to profile", () => {
  const landing = read("components/principles-of-energywork.tsx");
  const entry = read("components/reiki-practitioner-entry.tsx");
  const profile = read("components/app/profile-space-dashboard.jsx");
  assert.equal((landing.match(/<ReikiDaybookStart locale=\{locale\}/g) || []).length, 3);
  assert.ok(landing.includes("data-reiki-profile-link"));
  assert.ok(landing.includes('"/app/portrait"'));
  assert.ok(landing.includes("data-energywork-five-steps"));
  assert.ok(landing.includes("data-energywork-interactive-course"));
  assert.ok(entry.includes('continueTo: "energywork-daybook"'));
  assert.ok(entry.includes('await appFetch("bootstrap?view=portrait")'));
  assert.ok(entry.includes('?.status !== 401'));
  assert.ok(entry.includes('reikiLandingPath(language) + "/daybook"'));
  assert.ok(entry.includes("data-clarity-reiki-practitioner"));
  assert.ok(profile.indexOf("<ReikiProfileCourseCard locale={selected} />") < profile.indexOf("<p className={styles.clarityNotice}"));
  assert.ok(profile.includes("reikiLandingPath(selected)"));
});

test("Reiki landing uses the actual My Profile photo-led design",()=>{
 const landing=read("components/principles-of-energywork.tsx");
 const css=read("components/principles-of-energywork.module.css");
 assert.ok(landing.includes("data-reiki-week-photo={index + 1}"));
 assert.ok(css.includes("REIKI_MY_PROFILE_20261124"));
 assert.ok(css.includes('url("/images/holistic-house/andy-about.png")'));
 assert.ok(css.includes("grid-template-columns:35% minmax(0,1fr) 18px"));
 assert.ok(css.includes("#fff19b,#ffc520 44%,#e99000"));
 for(let week=1;week<=5;week++)assert.ok(css.includes('data-reiki-week-photo="'+week+'"'));
});
test("Integrated Profile preserves both Reiki and Video Studio",()=>{
 const profile=read("components/app/profile-space-dashboard.jsx");
 const dock=read("lib/unified-mobile-dock.mjs");
 assert.ok(profile.includes("<ReikiProfileCourseCard locale={selected} />"));
 assert.ok(profile.includes("data-profile-my-video"));
 assert.ok(dock.includes('case "reiki": return prefix+"/academy/principles-of-energywork"'));
});


test("My Reiki has three profile-style program destinations and real curriculum links",()=>{
 const landing=read("components/principles-of-energywork.tsx");
 const programs=read("components/reiki-programs.tsx");
 const css=read("components/principles-of-energywork.module.css");
 const page=read("app/[locale]/academy/[[...slug]]/page.tsx");
 const curriculum=JSON.parse(read("data/academy/yggdrasil-curriculum.json"));
 assert.deepEqual([...programs.matchAll(/id: "(free|master|pro)", label: "(Free|Master|Pro)"/g)].map(m=>m[1]),["free","master","pro"]);
 assert.ok(programs.includes('raw === "master" || raw === "pro" ? raw : "free"'));
 assert.ok(programs.includes('aria-current={id === active ? "page" : undefined}'));
 assert.ok(landing.indexOf("<ReikiProgramNavigation") < landing.indexOf('data-energywork-screen="intro"'));
 assert.ok(landing.includes('program !== "free" ? <ReikiAdvancedProgram'));
 assert.ok(page.includes("program={query.program}"));
 assert.equal(curriculum.levels.find(l=>l.id===1).steps.length,5);
 assert.equal(curriculum.levels.filter(l=>l.id>1).length,6);
 assert.ok(programs.includes("yggdrasilModuleLandings.filter(item => item.levelId > 1)"));
 assert.ok(programs.includes('base + "/basic-course#" + step.id.toLowerCase()'));
 assert.ok(css.includes('.reikiProgramTabs a[aria-current="page"]'));
 assert.ok(css.includes("min-height:44px"));
});

test("My Reiki matches Profile chrome, starts with a functional four-choice quiz and uses actual images",()=>{
 const landing=read("components/principles-of-energywork.tsx");
 const chrome=read("components/my-reiki-header.tsx");
 const quiz=read("components/my-reiki-quiz.tsx");
 const css=read("components/principles-of-energywork.module.css");
 const dock=read("app/unified-mobile-dock.css");
 assert.ok(landing.indexOf("<MyReikiHeader") < landing.indexOf("<ReikiProgramNavigation"));
 assert.ok(landing.indexOf("<MyReikiQuiz") < landing.indexOf('aria-labelledby="reiki-syllabus-title"'));
 assert.ok(chrome.includes("profile-hub-tabs.module.css") && chrome.includes("<SiteNavigation locale={locale} compact"));
 assert.ok(quiz.includes("setSelected") && quiz.includes("aria-pressed={selected === index}") && quiz.includes("<ReikiDaybookStart"));
 assert.equal((quiz.match(/\/images\/holistic-house\//g)||[]).length,4);
 assert.ok(landing.includes("src={detailPhotos[index]}") && landing.includes('href="#reiki-start"'));
 assert.ok(!landing.includes("<EnergyworkVideoArchive") && !landing.includes("<ReikiPublicReviews"));
 assert.ok(css.includes("support-therapy-cabinet-hd.webp") && css.includes(".reikiQuizGrid"));
 assert.ok(dock.includes("body:has([data-reiki-practitioner-landing]) [data-hh-unified-dock]"));
});

test("Approved second screen follows quiz without duplicate header and offers five photo weeks, four benefits and course entry",()=>{
 const landing=read("components/principles-of-energywork.tsx");
 const css=read("components/principles-of-energywork.module.css");
 const start=landing.indexOf('data-reiki-details-screen');
 const end=landing.indexOf('data-reiki-system-overview',start);
 const details=landing.slice(start,end);
 assert.ok(landing.indexOf("<MyReikiQuiz")<start && start<end);
 assert.ok(!details.includes("<MyReikiHeader") && !details.includes("<ReikiProgramNavigation"));
 assert.ok(details.includes("src={detailPhotos[index]}") && details.includes("data-reiki-week={index + 1}"));
 assert.ok(details.includes("data-reiki-benefit={index}") && details.includes("<ReikiDaybookStart locale={locale}"));
 assert.ok(details.indexOf("data-reiki-benefit")<details.indexOf("<ReikiDaybookStart"));
 assert.ok(details.includes("data-reiki-details-formats") && details.includes("data-reiki-daybook-entry"));
 assert.ok(!details.includes("<details") && !details.includes("<AcademyVideoPlayer"));
 assert.ok(css.includes("MY_REIKI_SECOND_SCREEN_20261125") && css.includes(".reikiBenefitGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))"));
});


test("Pro landing expands all six canonical modules inline after the existing roadmap",()=>{
 const programs=read("components/reiki-programs.tsx");
 const screens=read("components/reiki-pro-module-screens.tsx");
 const css=read("components/reiki-pro-module-screens.module.css");
 const curriculum=JSON.parse(read("data/academy/yggdrasil-curriculum.json"));
 const map=read("data/academy/yggdrasil-module-map.ts");
 assert.deepEqual(curriculum.levels.filter(l=>l.id>1).map(l=>l.steps.length),[6,5,5,5,5,6]);
 const slugs=[...map.matchAll(/slug: "([^"]+)",\s*levelId: (\d+)/g)].filter(m=>Number(m[2])>1).map(m=>m[1]);
 assert.deepEqual(slugs,["instructor-course","temple-magic","eastern-magic","western-magic","rune-magic","higher-magic"]);
 assert.ok(programs.includes('href={master ? "#reiki-master-" + row.id.toLowerCase() : "#" + reikiProModuleId(row.id)}'));
 assert.ok(programs.includes('href={master ? "#reiki-master-levels" : "#" + reikiProModuleId("instructor-course")}'));
 assert.ok(programs.includes('{!master && <ReikiProModuleScreens locale={locale} modules={modules} base={base} />}'));
 assert.ok(programs.indexOf("data-reiki-advanced-row")<programs.indexOf("{!master && <ReikiProModuleScreens"));
 assert.ok(programs.indexOf("{!master && <ReikiProModuleScreens")<programs.indexOf("className={styles.reikiSecondary}"));
 assert.ok(screens.includes("curriculum.levels.find(item => item.id === module.levelId)"));
 assert.ok(screens.includes('return "reiki-pro-" + slug'));
 assert.ok(screens.includes("id={id}") && screens.includes("data-reiki-pro-module={module.slug}"));
 assert.ok(screens.includes("src={module.image}") && screens.includes("level.theme[locale]"));
 assert.ok(screens.includes("level.steps.map(step =>") && screens.includes("step.title[locale]"));
 assert.ok(screens.includes('href={base + "/" + module.slug}'));
 assert.ok(!screens.includes("MyReikiHeader") && !screens.includes("ReikiProgramNavigation"));
 assert.ok(css.includes("100svh") && css.includes("minmax(0, 1fr)") && css.includes("max-width: 354px"));
 assert.ok(!/\.screen\s*\{[^}]*\bheight\s*:\s*\d+px/i.test(css));
});

test("Master roadmap stays on the same landing and exposes all five original levels", () => {
  const source = read("components/reiki-programs.tsx");
  const shared = read("data/academy/yggdrasil-basic-level-copy.ts");
  const previous = read("components/yggdrasil-program-landing.tsx");
  const css = read("components/reiki-master-levels.module.css");
  const basic = JSON.parse(read("data/academy/yggdrasil-curriculum.json")).levels.find(l => l.id === 1);
  const en = JSON.parse(read("data/academy/yggdrasil-en-settings-l1.json"));
  assert.deepEqual(basic.steps.map(s => s.number), [1,2,3,4,5]);
  assert.deepEqual(basic.steps.map(s => s.settings.length), [4,5,8,4,2]);
  for (const step of basic.steps) {
    assert.ok(step.id && step.title.en && step.title.ru && step.title.es);
    for (const setting of step.settings) assert.ok(en[setting.id]?.title && setting.title);
  }
  assert.ok(source.includes('href={master ? "#reiki-master-levels"'));
  assert.ok(source.includes('href={master ? "#reiki-master-" + row.id.toLowerCase() : "#" + reikiProModuleId(row.id)}'));
  assert.ok(source.includes('id={"reiki-master-" + step.id.toLowerCase()}'));
  assert.ok(source.indexOf('data-reiki-master-levels') > source.indexOf('data-reiki-advanced-row'));
  assert.ok(source.indexOf('data-reiki-master-levels') < source.indexOf('className={styles.reikiSecondary}'));
  assert.ok(source.includes('{master && basic &&'));
  assert.ok(source.includes('step.settings.map((setting, index)'));
  assert.ok(source.includes('basicAttunementName(locale, step, setting, index)'));
  assert.ok(source.includes('basicStepDescriptions[step.number][locale]'));
  assert.ok(previous.includes('basicStepDescriptions[step.number][locale]'));
  assert.ok(previous.includes('basicAttunementName(locale, step, setting, index)'));
  assert.ok(shared.includes('basicSpanishAttunements') && shared.includes('export function basicAttunementName'));
  assert.ok(source.includes('data-reiki-master-full-level={step.number}'));
  assert.ok(css.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'));
  assert.ok(css.includes('100svh') && css.includes('object-fit: contain'));
  assert.ok(css.includes('min-height: 46px'));
  assert.ok(!source.includes('MyReikiHeader') && !source.includes('ReikiProgramNavigation locale='));
});

test("Three approved Reiki overview screens immediately follow the second landing screen",()=>{
 const landing=read("components/principles-of-energywork.tsx");
 const css=read("components/principles-of-energywork.module.css");
 const start=landing.indexOf('data-reiki-system-overview');
 const end=landing.indexOf('id="energywork-how"',start);
 const overview=landing.slice(start,end);
 assert.ok(landing.indexOf('data-reiki-details-screen')<start && start<end);
 assert.ok(overview.includes('paths.map') && overview.includes('data-reiki-overview-system={system.key}'));
 assert.ok(overview.includes('src={artwork.src}') && overview.includes('unoptimized loading="lazy"'));
 assert.ok(overview.includes('href={academyUrl(locale, system.study)}'));
 assert.ok(!overview.includes('<MyReikiHeader') && !overview.includes('<ReikiProgramNavigation'));
 for (const key of ["tantra","kundalini","yggdrasil"]) {
   const asset=readFileSync(new URL("../public/images/holistic-house/reiki-"+key+"-approved-artwork.webp",import.meta.url));
   assert.equal(asset.toString("ascii",0,4),"RIFF");
   assert.equal(asset.toString("ascii",8,12),"WEBP");
   assert.ok(asset.includes(Buffer.from("VP8L")),"Lossless WebP required");
 }
 assert.ok(css.includes("MY_REIKI_APPROVED_SYSTEM_SCREENS_20261125"));
 assert.ok(css.includes("max-height:30svh") && css.includes("background-repeat:no-repeat,repeat-y"));
 assert.ok(!landing.includes('className={styles.reikiLegacyMaterials}'));
});


test("Second screen uses the exact five approved artwork crops and compact, uniform mobile rows",()=>{
 const landing=read("components/principles-of-energywork.tsx");
 const css=read("components/principles-of-energywork.module.css");
 const photoLine=landing.split("\n").find(line=>line.includes("const detailPhotos = ["));
 const filenames=["sunrise","lotus","kundalini","world-tree","initiation"].map(name=>"/images/holistic-house/reiki-week-"+name+"-approved.webp");
 assert.deepEqual([...photoLine.matchAll(/"([^"]+\.webp)"/g)].map(match=>match[1]),filenames);
 for(const filename of filenames){
   const bytes=readFileSync(new URL("../public"+filename,import.meta.url));
   assert.equal(bytes.toString("ascii",0,4),"RIFF");
   assert.equal(bytes.toString("ascii",8,12),"WEBP");
   assert.ok(bytes.length>20000 && bytes.length<60000);
 }
 assert.ok(landing.includes('src={detailPhotos[index]} alt="" fill sizes="(max-width: 700px) 34vw, 260px" unoptimized'));
 assert.ok(css.includes("REIKI_SECOND_SCREEN_REFERENCE_PARITY_20261125"));
 assert.ok(css.includes(".reikiDetailsScreen .stepRail a:hover,"));
 assert.ok(css.includes(".reikiDetailsScreen .stepRail a:focus-visible"));
 assert.ok(css.includes("grid-template-columns:33% minmax(0,1fr) 17px"));
 assert.ok(css.includes("min-height:clamp(58px,7.3svh,68px)"));
 assert.ok(css.includes("grid-auto-rows:1fr"));
 assert.ok(css.includes("max-height:740px"));
});

test("Owner's November 25 cleanup removes duplicate screens and keeps exact prices and original Yggdrasil video sources",()=>{
 const landing=read("components/principles-of-energywork.tsx");
 const css=read("components/principles-of-energywork.module.css");
 for(const marker of ['data-energywork-screen="foundations"','data-energywork-screen="meditation"','id="energywork-systems"','<ReikiPublicReviews','data-energywork-final-personal','€50','€60']) assert.ok(!landing.includes(marker),marker);
 assert.match(landing,/data-reiki-initiation-format="express"><strong>€0<\/strong>/);
 assert.match(landing,/data-reiki-initiation-format="live"><strong>€100<\/strong>/);
 assert.ok(landing.includes('rateExpress: "Express chat format"'));
 assert.ok(landing.includes('rateLive: "Full personal live initiation"'));
 assert.ok(landing.includes('youtubeId="DYo-fG-SyKw"'));
 assert.ok(landing.includes('youtubeId={yggdrasilMeditation.youtubeId}'));
 assert.ok(landing.indexOf('id="energywork-how"')<landing.indexOf('data-reiki-yggdrasil-intro-videos'));
 assert.ok(landing.indexOf('data-reiki-yggdrasil-intro-videos')<landing.indexOf('className={styles.finalCta}'));
 assert.ok(css.includes('width:100%;max-width:100%;min-width:0;aspect-ratio:auto'));
 assert.ok(css.includes('grid-template-columns:minmax(0,33%) minmax(0,1fr) 17px'));
});
