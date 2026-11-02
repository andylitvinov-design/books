import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve,dirname} from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const read=path=>readFileSync(resolve(root,path),"utf8");
test("Support and Video Studio preserve AI as tab six and add MyTube as seven",()=>{
 for(const path of ["components/holistic-support-mobile.tsx","components/holistic-support-mandala-dock.tsx"]){
  const s=read(path);
  assert.match(s,/data-support-video-ai/);assert.match(s,/data-support-mytube/);
  assert.ok(s.lastIndexOf("data-support-mytube")>s.lastIndexOf("data-support-video-ai"));
  if(path.includes("mandala-dock"))assert.match(s,/inMyTube \? "\/"\+locale\+"\/holistic-support\/mandala#video-director-chat"/);
 }
 assert.match(read("components/holistic-support-mobile.module.css"),/repeat\(7,/);
 assert.match(read("components/mobile-bottom-navigation.tsx"),/mobile\|mandala\|mytube/);
});
test("MyTube is reachable from private Cabinet, Messages and public Practice without new auth",()=>{
 for(const path of ["components/app/messages-bottom-navigation.jsx","components/app/app-workspace.jsx","components/practice-showcase.jsx"]){
  const s=read(path);assert.match(s,/holistic-support\/mytube/);assert.match(s,/video-ai/);
 }
 assert.match(read("components/practice-showcase.module.css"),/repeat\(7,/);
 assert.match(read("app/[locale]/app/[[...path]]/workspace.css"),/repeat\(7,/);
});
test("MyTube shares the vetted Library index and privacy-respecting ranking",()=>{
 const p=read("app/[locale]/holistic-support/mytube/page.tsx");
 const hub=read("components/library-hub.tsx");
 const feed=read("components/mytube-feed.tsx");
 assert.match(p,/loadPublicLibraryFeed/);assert.match(p,/loadApprovedVideoDiscoveries/);
 assert.match(p,/buildPublicLibraryVideos/);assert.match(hub,/export function buildPublicLibraryVideos/);
 assert.match(hub,/buildPublishedVideoIndex/);assert.match(feed,/rankDiscoveryVideos/);
 for(const key of ["VIDEO_LIFE_AREAS","VIDEO_GOALS","VIDEO_CONTENT_TYPES","VIDEO_DIRECTIONS","VIDEO_TRADITIONS","hh-public-video-favorites-v1","youtube-nocookie.com"])assert.ok(feed.includes(key),key);
 assert.doesNotMatch(p,/private|patient|access_token/);
});
