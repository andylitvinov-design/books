import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {buildPersonalImageryCourse} from "../lib/mandala/personal-guided-course.mjs";

const read = file => readFileSync(new URL("../"+file,import.meta.url),"utf8");

test("therapy mode is a dedicated programme directly under the central moving video",()=>{
  const studio=read("components/mandala-free-video-studio.tsx");
  const guided=read("components/mandala-guided-course.tsx");
  const css=read("components/mandala-video-mobile.module.css");
  const top=["data-video-quick-builder",'data-video-quick-section="1"',
    "data-video-live-stage",'id="video-hero"','id="guided-video-series"',
    "data-video-scene-library","data-video-quick-tier"].map(key=>studio.indexOf(key));
  const support=["data-video-daily-picks","data-video-support-layout","data-video-therapy-toggle",
    "data-video-category-rail","data-video-preview-choices","data-video-editor-nav"].map(key=>studio.indexOf(key));
  for(const [name,indices] of [["top course and video stage",top],["existing Support controls",support]]){
    assert.ok(indices.every(index=>index>=0),name+" landmarks remain");
    assert.ok(indices.slice(1).every((index,i)=>index>indices[i]),
      name+" remains ordered: source must show the therapy programme immediately after the top preview");
  }
  assert.doesNotMatch(studio,/data-video-mode-switch/);
  assert.match(studio,/studioMode==="therapy" \? <div className=\{videoStyles\.therapyCourse\}/);
  assert.match(studio,/data-video-studio-mode=\{studioMode\}/);
  assert.match(studio,/data-video-affirmations-feature checked=\{affirmations\.enabled\}/);
  assert.match(studio,/data-video-photo-enabled checked=\{!backgroundOnly\}/);
  assert.match(studio,/if\(!photoUrl\)setBackgroundOnly\(true\)/);
  assert.match(studio,/setAffirmations\(current=>\(\{\.\.\.defaultAffirmations,enabled:current\.enabled/);
  assert.match(guided,/data-video-key-difficulty/);
  assert.match(guided,/data-video-key-goal/);
  assert.match(guided,/data-video-goal-accents/);
  assert.match(guided,/data-guided-create-plan/);
  assert.match(guided,/data-guided-profile-consent/);
  assert.match(guided,/affirmationGoalCatalog\[locale\]\.map/);
  assert.match(guided,/data-guided-focus-goal/);
  assert.match(css,/\.courseIndicator\{/);
});

test("optional personal difficulty and goal inform all eight scripts without an AI request",()=>{
  for(const locale of ["ru","en","es"]){
    const programme=buildPersonalImageryCourse({
      locale,theme:"energy",goals:["energy","relationships"],
      keyDifficulty:"I rush when under pressure <script> \n  ",
      keyGoal:"A kind pause, meaningful connection",
      detailGoals:["Warm connection","My boundaries"],
    });
    assert.equal(programme.sessionCount,8);
    assert.equal(programme.freeVideoCount,1);
    assert.equal(programme.sessions.length,8);
    assert.equal(programme.keyDifficulty,"I rush when under pressure script");
    assert.equal(programme.keyGoal,"A kind pause, meaningful connection");
    assert.deepEqual(programme.detailGoals,["Warm connection","My boundaries"]);
    assert.equal(programme.evidence.length,0,"private scores cannot be invented");
    for(const session of programme.sessions){
      assert.match(session.script,/I rush when under pressure script/);
      assert.match(session.script,/A kind pause, meaningful connection/);
      assert.match(session.script,/Warm connection/);
      assert.doesNotMatch(session.script,/<script>|\x00/);
      assert.equal(session.videoDurationSeconds,60);
    }
  }
});

test("focus is bounded and source verified test claims remain absent by default",()=>{
  const programme=buildPersonalImageryCourse({
    locale:"ru",goals:["goals"],keyGoal:"x".repeat(250),keyDifficulty:"\n\t<private>",
  });
  assert.equal(programme.keyGoal.length,140);
  assert.equal(programme.keyDifficulty,"private");
  assert.equal(programme.requiresPractitionerReview,true);
  assert.equal(programme.paidAccessVerified,false);
  assert.equal(programme.sessions[1].delivery,"requires-confirmed-package-and-review");
  const source=read("components/mandala-guided-course.tsx");
  assert.match(source,/if\(consent && !\["ready","empty"\]\.includes\(profileStatus\)\)void loadPrivateProfile\(\)/);
  assert.match(source,/if\(!consent \|\| disabled/);
});
