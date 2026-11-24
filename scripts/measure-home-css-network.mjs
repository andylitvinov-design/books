import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const paths=["/","/ru","/es"];
export function snapshot(html) {
  const links=[...html.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi)]
    .map(x=>x[0].match(/\bhref=["']([^"']+)/i)?.[1]).filter(Boolean);
  const preloads=[...html.matchAll(/<link\b[^>]*\brel=["']preload["'][^>]*>/gi)].map(x=>x[0]);
  return {decodedHtmlBytes:Buffer.byteLength(html),cssLinks:links,
    highPriorityImages:preloads.filter(x=>/\bas=["']image["']/i.test(x)&&/fetchpriority=["']high["']/i.test(x))
      .map(x=>x.match(/\bhref=["']([^"']+)/i)?.[1]).filter(Boolean)};
}
async function main(){
  const origin=new URL(process.argv[2]||"http://127.0.0.1:3000");
  const list=[];
  for(const path of paths){
    const response=await fetch(new URL(path,origin),{signal:AbortSignal.timeout(20000)});
    assert.equal(response.status,200,path);
    const data=snapshot(await response.text());
    const unique=[...new Set(data.cssLinks)];
    let cssBytes=0;
    for(const href of unique){
      const s=await fetch(new URL(href,origin),{signal:AbortSignal.timeout(20000)});
      assert.equal(s.status,200,href);
      cssBytes+=Buffer.byteLength(await s.text());
    }
    assert.ok(data.decodedHtmlBytes<300000,"HTML payload regression >300 KB: "+path);
    assert.ok(data.highPriorityImages.some(href=>/ideas-pine-reference\.webp/.test(href)),
      "Scenic hero background preload missing: "+path);
    assert.ok(data.highPriorityImages.some(href=>/my-coach-motion\//.test(href)),
      "Persona first-screen image preload missing: "+path);
    list.push({path,htmlBytes:data.decodedHtmlBytes,cssFiles:unique.length,cssBytes,
      highPriorityImages:data.highPriorityImages});
  }
  console.log(JSON.stringify({origin:origin.origin,source:"built-Next-local",note:"CSS and HTML decoded bytes are uncompressed; these are not Lighthouse times",pages:list},null,2));
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href)
  main().catch(e=>{console.error(e);process.exitCode=1});
