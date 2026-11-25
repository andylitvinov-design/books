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
