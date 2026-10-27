import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
 inspectNativeReel, normalizeNativeReelCaption, normalizeReelReadbackLink,
 TAO_INSTAGRAM_HANDLE, TAO_PUBLIC_LANDING, TAO_REEL_CAPTIONS, REEL_MAX_FILE_BYTES,
} from "../lib/instagram/native-reel-kit.mjs";

const file={name:"dao_water_ru_v01.mp4",type:"video/mp4",size:24000000};
const meta={width:1080,height:1920,duration:30};

test("valid local video and correct public target",()=>{
 const result=inspectNativeReel(file,meta);
 assert.equal(result.ready,true);
 assert.deepEqual(result.warnings,[]);
 assert.equal(TAO_INSTAGRAM_HANDLE,"tao.ideas");
 assert.match(TAO_PUBLIC_LANDING,/utm_campaign=dao_wisdom_launch/);
});

test("fail closed for absent, invalid, oversized, corrupt, landscape, short or long videos",()=>{
 const cases=[
 [null,meta,"file_required"],
 [{...file,name:"video.webm"},meta,"file_invalid"],
 [{...file,type:"text/html"},meta,"file_invalid"],
 [{...file,size:REEL_MAX_FILE_BYTES+1},meta,"file_invalid"],
 [{...file,size:0},meta,"file_invalid"],
 [file,null,"metadata_pending"],
 [file,{...meta,duration:Infinity},"metadata_invalid"],
 [file,{...meta,duration:2},"duration_invalid"],
 [file,{...meta,duration:901},"duration_invalid"],
 [file,{...meta,width:1920,height:1080},"aspect_invalid"],
 [file,{...meta,width:1080,height:1080},"aspect_invalid"],
 ];
 for(const [f,m,code] of cases)assert.equal(inspectNativeReel(f,m).error,code);
});

test("warn for editorial duration and low resolution; MOV is supported",()=>{
 assert.deepEqual(inspectNativeReel({name:"x.MOV",type:"video/quicktime",size:300},
 {width:540,height:960,duration:10}).warnings,["editorial_duration","low_resolution"]);
});

test("editable multilingual captions have author attribution and no medical guarantees",()=>{
 for(const locale of ["ru","en","es"]){
  const caption=TAO_REEL_CAPTIONS[locale];
  assert.ok(normalizeNativeReelCaption(caption));
  assert.ok([...caption].length<2200);
  assert.doesNotMatch(caption,/cure|diagnose|вылеч|излеч|лечим/iu);
 }
 assert.equal(normalizeNativeReelCaption(""),null);
 assert.equal(normalizeNativeReelCaption("x".repeat(2201)),null);
 assert.equal(normalizeNativeReelCaption("x\u0000"),null);
});

test("readback links accept actual Instagram permalink format, never third-party URL",()=>{
 assert.equal(normalizeReelReadbackLink("https://instagram.com/reel/C012abC_-7?igsh=stuff"),"https://www.instagram.com/reel/C012abC_-7/");
 for(const value of ["http://instagram.com/reel/ABCDE/","https://instagram.com.evil.org/reel/ABCDE/",
  "https://instagram.com/api/client/private","https://instagram.com:443@evil.org/reel/ABCDE",
  "https://instagram.com/reel/%2Fetc"]) assert.equal(normalizeReelReadbackLink(value),null,value);
});

test("owner-only UI uses device share and no Meta/Metricool publishing client",()=>{
 const ui=readFileSync(new URL("../components/instagram-native-reel-kit.tsx",import.meta.url),"utf8");
 const admin=readFileSync(new URL("../app/admin/videos/page.tsx",import.meta.url),"utf8");
 const css=readFileSync(new URL("../components/instagram-native-reel-kit.module.css",import.meta.url),"utf8");
 assert.match(ui,/navigator\.canShare\(\{ files: \[file\] \}\)/);
 assert.match(ui,/navigator\.share\(\{ files: \[file\] \}\)/);
 assert.match(ui,/rightsApproved/);
 assert.match(ui,/onLoadedMetadata/);
 assert.match(ui,/NOT proof of publication/);
 assert.doesNotMatch(ui,/fetch\(|axios|instagram_business_content_publish|metricool\.com|access_token/i);
 assert.match(admin,/requireAdminRequest/);
 assert.match(admin,/<InstagramNativeReelKit/);
 assert.match(css,/@media \(max-width: 430px\)/);
});
