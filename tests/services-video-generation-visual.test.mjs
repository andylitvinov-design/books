import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=p=>readFileSync(new URL("../"+p, import.meta.url),"utf8");
const jsx=read("components/services-video-generation-card.tsx");
const css=read("components/services-video-generation-card.module.css");
test("approved compact three-scenario card remains localized and accessible",()=>{
 for(const s of ["Видео-настрой","Видео-медитация","Видео-послание","Сгенерировать видео","Video meditation","Vídeo meditación","data-assist-video-scenario","data-assist-video-create"])assert.ok(jsx.includes(s),s);
 assert.equal((jsx.match(/data-assist-video-scenario=/g)||[]).length,1);
 assert.match(jsx,/holistic-support\/mandala/);
 assert.match(jsx,/className=\{styles.flora\}/);
 assert.match(jsx,/alt=""/);
});
test("new illustrations are bundled first-party and mobile density is bounded",()=>{
 for(const name of ["assist-video-botanical","assist-video-lake","assist-video-letter"]){
  assert.ok(jsx.includes(name+".svg"));
  const svg=read("public/images/holistic-house/"+name+".svg");
  assert.match(svg,/^<svg [^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.ok(!/<script|foreignObject|https?:\/\//.test(svg.replace('http://www.w3.org/2000/svg','')),"no external content");
 }
 assert.match(css,/grid-template-columns:104px minmax\(0,1fr\)/);
 assert.match(css,/height:69px/);
 assert.match(css,/@media\(max-width:355px\)/);
 assert.match(css,/.cta\{[^}]*white-space:nowrap/);
 assert.match(css,/focus-visible/);
});
