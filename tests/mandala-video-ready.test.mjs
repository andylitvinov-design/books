import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {selectResourcePractice} from "../lib/mandala/resource-practice-selector.mjs";

const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const ready=readFileSync(new URL("../components/mandala-video-ready.tsx",import.meta.url),"utf8");
const delivery=readFileSync(new URL("../components/mandala-video-delivery.tsx",import.meta.url),"utf8");

test("Ready is the sixth existing editor tab, never a seventh or a parallel renderer",()=>{
  assert.match(studio,/type StudioWorkspace =[^;]*"ready"/);
  const rail=studio.slice(studio.indexOf("const workspaceTabs=["),studio.indexOf("] as const;",studio.indexOf("const workspaceTabs=[")));
  assert.equal((rail.match(/id:"/g)||[]).length,6);
  assert.match(rail,/id:"pro"[^]*id:"ready"/);
  assert.doesNotMatch(rail,/id:"practices"/);
  assert.match(studio,/data-active-workspace=\{activeWorkspace/);
  assert.match(ready,/data-ready-view=\{view\}/);
});
test("Video must be verified; guests get login before save, and existing signed upload is reused",()=>{
  assert.match(ready,/if\(!verified\|\|!video\|\|disabled\)return/);
  assert.match(ready,/if\(!signedIn\|\|intent==="telegram"\|\|intent==="house"\)/,
    "guest save and Telegram entry open the action-invoked gate");
  assert.match(studio,/<MandalaVideoReady/);
  assert.match(ready,/data-video-ready/);
  assert.match(delivery,/data-video-save-to-library/);
  assert.match(delivery,/await privateUpload\(\)/);
  assert.match(delivery,/uploadToSignedUrl/);
  assert.match(delivery,/appFetch\("personal-videos\/"\+created.id,undefined,"POST"\)/);
});
test("Ritual uses existing no-provider safety selector in three languages",()=>{
  for(const locale of ["en","ru","es"]){
    const ordinary=selectResourcePractice({locale,theme:"energy",kind:"ritual",focus:{goal:"calm and balance"}});
    assert.equal(ordinary.status,"ready");
    assert.equal(ordinary.steps.length,3);
    const urgent=selectResourcePractice({locale,theme:"energy",kind:"ritual",focus:{goal:"I want to die"}});
    assert.equal(urgent.status,"blocked");
    const unsafeAnchor=selectResourcePractice({locale,theme:"energy",kind:"ritual",
      focus:{goal:"calm and balance",details:["I want to die"]}});
    assert.equal(unsafeAnchor.status,"blocked","the optional anchor must be screened");
  }
  assert.match(ready,/selectResourcePractice/);
  assert.match(ready,/details:\[anchor,\.\.\.focus\.details\]/);
  assert.match(ready,/focus\.details,anchor,wish/);
  assert.match(ready,/navigator\.clipboard\.writeText/);
  assert.match(ready,/onOpenCourse/);
});

test("approved Save gate opens only from an explicit Ready action",()=>{
  assert.match(ready,/function chooseDelivery\(intent:/);
  assert.match(ready,/data-ready-save-gate-overlay/);
  assert.match(ready,/role="dialog" aria-modal="true"/);
  assert.match(ready,/aria-labelledby="ready-save-gate-title"/);
  assert.match(ready,/data-ready-save-gate-signin/);
  assert.match(ready,/data-ready-save-gate-continue/);
  assert.match(ready,/data-ready-save-gate-telegram-start/);
  assert.match(ready,/data-ready-save-gate-refresh-login/);
  assert.match(ready,/setView\("login"\);return;/);
  assert.doesNotMatch(ready,/useEffect\(\(\)=>\s*setView\("login"\)/);
  assert.match(ready,/if\(view!=="login"\)return/);
  assert.match(ready,/event\.key==="Escape"/);
  assert.match(ready,/document\.body\.style\.overflow=oldOverflow/);
  assert.match(ready,/gateLauncherRef\.current\?\.focus\(\{preventScroll:true\}\)/);
});
test("Telegram Start uses signed challenge, never impersonates sign-in or silently uploads",()=>{
  assert.match(ready,/if\(!signedIn\|\|telegramStatus==="loading"\)return/);
  assert.match(ready,/appFetch\("personal-videos\/delivery",\{\s*action:"connect",locale,consent:true\s*\},"POST"\)/);
  assert.ok(ready.includes(String.raw`https:\/\/t\.me\/`),"only validated Telegram URL");
  assert.match(ready,/start=\[A-Za-z0-9_-\]\{32\}/);
  assert.match(ready,/target="_blank" rel="noopener noreferrer" data-ready-save-gate-telegram-start/);
  assert.match(ready,/appFetch\("personal-videos\/delivery"\)/);
  assert.doesNotMatch(ready,/https:\/\/t\.me\/andydotbot/);
  assert.doesNotMatch(ready,/window\.location\s*=/);
  assert.match(ready,/«Старт» привязывает бота к вашему кабинету, но не отправляет и не сохраняет видео автоматически/);
});
test("Save gate matches approved warm mobile design and all three locales",()=>{
  const css=readFileSync(new URL("../components/mandala-video-ready.module.css",import.meta.url),"utf8");
  for(const locale of ["en","ru","es"]){
    const start=ready.indexOf("  "+locale+":{",ready.indexOf("const COPY={"));
    const end=locale==="en"?ready.indexOf("  ru:{",start):
      locale==="ru"?ready.indexOf("  es:{",start):ready.indexOf("} as const;",start);
    assert.ok(start>0&&end>start,"locale block "+locale);
    assert.match(ready.slice(start,end),/saveGateTitle:/);
    assert.match(ready.slice(start,end),/saveGateTelegram:/);
  }
  assert.match(css,/\.gateBackdrop\{position:fixed/);
  assert.match(css,/\.gateDialog\{position:relative/);
  assert.match(css,/max-height:calc\(100dvh - 22px\)/);
  assert.match(css,/overflow-y:auto/);
  assert.match(css,/ready-save-sunrise-portrait\.jpg/);
  assert.match(css,/@media\(max-width:370px\)/);
  assert.match(ready,/data-ready-save-intent=\{gateIntent\}/);
});


test("all three Ready offers expand inline, generate scripts without navigation or paid rendering",()=>{
  const css=readFileSync(new URL("../components/mandala-video-ready.module.css",import.meta.url),"utf8");
  assert.match(ready,/const \[activeOffer,setActiveOffer\]=useState<Offer\|null>\(null\)/);
  assert.match(ready,/data-ready-offer-panel data-ready-offer=\{activeOffer\}/);
  assert.match(ready,/id="ready-inline-offer"/);
  for(const offer of ["meditation","ritual","journey"]){
    assert.match(ready,new RegExp('onClick=\\{\\(\\)=>selectOffer\\("'+offer+'"\\)\\}'));
    assert.match(ready,new RegExp('aria-expanded=\\{activeOffer==="'+offer+'"\\}'));
    assert.doesNotMatch(ready,new RegExp('selectView\\("'+offer+'"\\)'));
  }
  assert.match(ready,/data-ready-generate-text/);
  assert.match(ready,/onClick=\{generateOffer\}/);
  assert.match(ready,/generatedOffer===activeOffer/);
  assert.match(ready,/buildPersonalMeditationScript\(/);
  assert.match(ready,/buildPersonalImageryCourse\(/);
  assert.match(ready,/selectResourcePractice\(/);
  assert.match(ready,/data-ready-meditation-text/);
  assert.match(ready,/data-ready-ritual-result/);
  assert.match(ready,/data-ready-eight-sessions/);
  assert.match(ready,/courseTexts\.map\(/);
  assert.match(ready,/ritual\.status==="blocked"\?/);
  assert.match(ready,/meditationEditor/);
  assert.match(ready,/data-ready-save-choices/);
  assert.match(ready,/data-ready-save-gate-overlay/);
  assert.doesNotMatch(ready,/onClick=\{onOpenCourse\} data-ready-journey/);
  assert.match(css,/\.offerPanel\{display:grid/);
  assert.match(css,/\.journey>button\[aria-expanded="true"\]/);
  assert.match(css,/scroll-margin-bottom:calc\(82px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css,/white-space:pre-wrap/);
  for(const loc of ["en","ru","es"]){
    const start=ready.indexOf("  "+loc+":{",ready.indexOf("const COPY={"));
    const end=loc==="en"?ready.indexOf("  ru:{",start):loc==="ru"?ready.indexOf("  es:{",start):ready.indexOf("} as const;",start);
    const lang=ready.slice(start,end);
    for(const label of ["generateText","copyText","medText","sessionText"])
      assert.ok(lang.includes(label+":"),loc+" has "+label);
  }
});

test("the three reused local writers return goal-aware texts for EN, RU and ES",async()=>{
  const [{buildPersonalMeditationScript},{buildPersonalImageryCourse}]=await Promise.all([
    import("../lib/mandala/personal-meditation-script.mjs"),
    import("../lib/mandala/personal-guided-course.mjs"),
  ]);
  for(const locale of ["en","ru","es"]){
    const focus={difficulty:"stress in the evening",goal:"feel connected",goals:["relationships"],details:[]};
    const meditation=buildPersonalMeditationScript({locale,theme:"relationships",wish:"connection",focus,length:5});
    assert.ok(meditation.length>350,locale+" has a real meditation script");
    assert.ok(meditation.includes("feel connected"),locale+" preserves explicit personal goal");
    const course=buildPersonalImageryCourse({locale,theme:"relationships",goals:focus.goals,
      keyDifficulty:focus.difficulty,keyGoal:focus.goal,detailGoals:focus.details});
    assert.equal(course.sessionCount,8);
    assert.equal(course.sessions.length,8);
    assert.ok(course.sessions.every(s=>s.script.length>70));
    assert.ok(course.sessions[0].script.includes("feel connected"));
    const ritual=selectResourcePractice({locale,theme:"relationships",kind:"ritual",focus});
    assert.equal(ritual.status,"ready");
    assert.equal(ritual.steps.length,3);
    const blocked=selectResourcePractice({locale,theme:"relationships",kind:"ritual",focus:{goal:"I want to die"}});
    assert.equal(blocked.status,"blocked");
  }
});
