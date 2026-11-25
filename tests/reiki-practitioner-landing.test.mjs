import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
test("Reiki landing promotes free Daybook, preserves classic course and links to profile", () => {
  const landing = read("components/principles-of-energywork.tsx");
  const entry = read("components/reiki-practitioner-entry.tsx");
  const profile = read("components/app/profile-space-dashboard.jsx");
  assert.equal((landing.match(/<ReikiDaybookStart locale=\{locale\}/g) || []).length, 2);
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
 assert.ok(landing.includes("src={weekPhotos[index]}") && landing.includes('href="#reiki-start"'));
 assert.ok(!landing.includes("<AcademyVideoPlayer") && !landing.includes("<EnergyworkVideoArchive"));
 assert.ok(css.includes("support-therapy-cabinet-hd.webp") && css.includes(".reikiQuizGrid"));
 assert.ok(dock.includes("body:has([data-reiki-practitioner-landing]) [data-hh-unified-dock]"));
});
