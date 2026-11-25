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
 assert.ok(!landing.includes("<AcademyVideoPlayer") && !landing.includes("<EnergyworkVideoArchive"));
 assert.ok(css.includes("support-therapy-cabinet-hd.webp") && css.includes(".reikiQuizGrid"));
 assert.ok(dock.includes("body:has([data-reiki-practitioner-landing]) [data-hh-unified-dock]"));
});

test("Approved second screen follows quiz without duplicate header and offers five photo weeks, four benefits and course entry",()=>{
 const landing=read("components/principles-of-energywork.tsx");
 const css=read("components/principles-of-energywork.module.css");
 const start=landing.indexOf('data-reiki-details-screen');
 const end=landing.indexOf('className={styles.foundations}',start);
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
 assert.ok(programs.includes('href={master ? row.href : "#" + reikiProModuleId(row.id)}'));
 assert.ok(programs.includes('href={master ? base + "/basic-course" : "#" + reikiProModuleId("instructor-course")}'));
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

test("Three approved Reiki overview screens immediately follow the second landing screen",()=>{
 const landing=read("components/principles-of-energywork.tsx");
 const css=read("components/principles-of-energywork.module.css");
 const start=landing.indexOf('data-reiki-system-overview');
 const end=landing.indexOf('className={styles.foundations}',start);
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
 assert.ok(landing.includes('className={styles.reikiLegacyMaterials}'));
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
