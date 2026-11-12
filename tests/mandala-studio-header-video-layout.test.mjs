import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
const helpCss=readFileSync(new URL("../components/sitewide-ihelp.module.css",import.meta.url),"utf8");
test("Goal and Montage share a single Canvas with an Intro/My video rail",()=>{
 assert.equal((studio.match(/data-video-mandala-hero/g)||[]).length,1);
 for(const selector of ["data-video-intro-my-rail","data-video-intro-info","data-video-my-film","data-video-intro-guide"])
   assert.ok(studio.includes(selector),selector);
 assert.ok(css.includes("grid-template-columns:minmax(0,1fr) clamp(92px,28vw,120px)"));
});
test("iHelp is in the brand header and a second floating launcher is suppressed",()=>{
 assert.ok(studio.includes("data-video-ihelp-header-trigger data-hh-ihelp-trigger"));
 assert.ok(studio.includes("hh:ihelp-open-video-director"));
 assert.ok(helpCss.includes(":global(body:has([data-video-ihelp-header-trigger])) .launcher"));
});
test("Montage Style has the original six style choices and a green next step",()=>{
 for(const selector of ['data-video-montage-next="text"','onClick={()=>setMontagePanel("text")}',
    "data-video-montage-style={index}",'aria-pressed={brightness==="soft"}'])
   assert.ok(studio.includes(selector),selector);
 assert.ok(css.includes("height:clamp(42px,6.2dvh,55px)"));
});