import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const paths=["/","/ru","/es"];
export function snapshot(html) {
  const links=[...html.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi)]
    .map(x=>x[0].match(/\bhref=["']([^"']+)/i)?.[1]).filter(Boolean);
  const preloads=[...html.matchAll(/<link\b[^>]*\brel=["']preload["'][^>]*>/gi)].map(x=>x[0]);
  // The approved guide can change: validate the ACTUAL first SSR hero image
  // rather than accepting any preloaded asset or the old Max-only directory.
  const heroTag=html.match(/<div\b[^>]*\bdata-home-ali-persona=(["'])[^"']+\1[^>]*>\s*(?:<!--[\s\S]*?-->\s*)*(<img\b[^>]*>)/i)?.[2];
  const attr=(tag,name)=>tag?.match(new RegExp("(?:^|\\s)"+name+"\\s*=\\s*([\"'])(.*?)\\1","i"))?.[2]??null;
  const heroImage=heroTag?{src:attr(heroTag,"src"),loading:attr(heroTag,"loading"),fetchPriority:attr(heroTag,"fetchpriority")}:null;
  return {decodedHtmlBytes:Buffer.byteLength(html),cssLinks:links,heroImage,
    highPriorityImages:preloads.filter(x=>/\bas=["']image["']/i.test(x)&&/fetchpriority=["']high["']/i.test(x))
      .map(x=>x.match(/\bhref=["']([^"']+)/i)?.[1]).filter(Boolean)};
}
export function assertHeroPreload(data,path="/"){
  // Match the actual rendered guide. A scenic or stale persona preload
  // cannot substitute for the real portrait.
  const hero=data.heroImage;
  assert.ok(hero&&/^\/images\/holistic-house\/(?:ali-inner-alchemist-hero\.webp|my-coach-motion\/[a-z0-9_-]+\.webp)$/i.test(hero.src??""),
    "Approved SSR persona image missing: "+path);
  assert.equal(hero.loading,"eager","Hero image must load eagerly: "+path);
  assert.equal(hero.fetchPriority,"high","Hero image priority missing: "+path);
  assert.ok(data.highPriorityImages.includes(hero.src),"Actual SSR hero image preload missing: "+path);
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
    assertHeroPreload(data,path);
    list.push({path,htmlBytes:data.decodedHtmlBytes,cssFiles:unique.length,cssBytes,
      heroImage:data.heroImage,highPriorityImages:data.highPriorityImages});
  }
  console.log(JSON.stringify({origin:origin.origin,source:"built-Next-local",note:"CSS and HTML decoded bytes are uncompressed; these are not Lighthouse times",pages:list},null,2));
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href)
  main().catch(e=>{console.error(e);process.exitCode=1});
