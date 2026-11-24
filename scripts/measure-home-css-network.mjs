import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const paths=["/","/ru","/es"];
export function snapshot(html) {
  const links=[...html.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi)]
    .map(x=>x[0].match(/\bhref=["']([^"']+)/i)?.[1]).filter(Boolean);
  const preloads=[...html.matchAll(/<link\b[^>]*\brel=["']preload["'][^>]*>/gi)].map(x=>x[0]);
  const heroPortraits=[...html.matchAll(/<img\b[^>]*>/gi)].map(x=>x[0])
    .filter(tag=>/\bclass=["'][^"']*home-dialogue-entry_heroPortrait__[^"']*["']/i.test(tag));
  const heroImage=heroPortraits.length===1 ? heroPortraits[0].match(/\bsrc=["']([^"']+)["']/i)?.[1] : null;
  const heroImageEager=heroPortraits.length===1 && /\bloading=["']eager["']/i.test(heroPortraits[0]) && /\bfetchpriority=["']high["']/i.test(heroPortraits[0]);
  return {decodedHtmlBytes:Buffer.byteLength(html),cssLinks:links,heroImage,heroImageEager,
    highPriorityImages:preloads.filter(x=>/\bas=["']image["']/i.test(x)&&/fetchpriority=["']high["']/i.test(x))
      .map(x=>x.match(/\bhref=["']([^"']+)/i)?.[1]).filter(Boolean)};
}
// Verify actual rendered hero, not a hard-coded historical filename.
export function assertHeroPreload(data,path="/"){
  assert.ok(data.heroImage && data.heroImageEager,"Missing unique eager high-priority hero image: "+path);
  assert.ok(data.highPriorityImages.includes(data.heroImage),"Persona first-screen image preload missing: "+path+" ("+data.heroImage+")");
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
    const stylesheets=[];
    for(const href of unique){
      const s=await fetch(new URL(href,origin),{signal:AbortSignal.timeout(20000)});
      assert.equal(s.status,200,href);
      const css=await s.text();
      const bytes=Buffer.byteLength(css);
      cssBytes+=bytes;
      const foreignPrefixes=["test-scale-guide_","priority-methods-review_","profile-hub-tabs_","messenger-ai-landing_"];
      stylesheets.push({href,decodedBytes:bytes,unrelatedModuleMarkers:foreignPrefixes.filter(prefix=>css.includes(prefix))});
    }
    assert.ok(data.decodedHtmlBytes<300000,"HTML payload regression >300 KB: "+path);
    assert.ok(data.highPriorityImages.some(href=>/ideas-pine-reference\.webp/.test(href)),
      "Scenic hero background preload missing: "+path);
    assertHeroPreload(data,path);
    list.push({path,htmlBytes:data.decodedHtmlBytes,cssFiles:unique.length,cssBytes,
      heroImage:data.heroImage,highPriorityImages:data.highPriorityImages,stylesheets});
  }
  console.log(JSON.stringify({origin:origin.origin,source:"built-Next-local",note:"CSS and HTML decoded bytes are uncompressed; these are not Lighthouse times",pages:list},null,2));
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href)
  main().catch(e=>{console.error(e);process.exitCode=1});
