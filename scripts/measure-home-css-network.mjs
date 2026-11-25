import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";
const paths=["/","/ru","/es"];
const samirPath="/images/holistic-house/ali-inner-alchemist-hero.webp";
const samirBytes=readFileSync(new URL("../public"+samirPath,import.meta.url));
const inlineSamir=samirBytes.length<=4096?"data:image/webp;base64,"+samirBytes.toString("base64"):null;
export function snapshot(html) {
  const sheets=[...html.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,"").matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi)].map(x=>x[0]);
  const href=tag=>tag.match(/\bhref=["']([^"']+)/i)?.[1];
  const links=sheets.map(href).filter(Boolean);
  const blockingCssLinks=sheets.filter(tag=>!/\bmedia\s*=\s*["']print["']/i.test(tag)).map(href).filter(Boolean);
  const preloads=[...html.matchAll(/<link\b[^>]*\brel=["']preload["'][^>]*>/gi)].map(x=>x[0]);
  // The approved guide can change: validate the ACTUAL first SSR hero image
  // rather than accepting any preloaded asset or the old Max-only directory.
  const heroMatch=html.match(/<div\b[^>]*\bdata-home-ali-persona=(["'])([^"']+)\1[^>]*>\s*(?:<!--[\s\S]*?-->\s*)*(<img\b[^>]*>)/i);
  const heroTag=heroMatch?.[3];
  const attr=(tag,name)=>tag?.match(new RegExp("(?:^|\\s)"+name+"\\s*=\\s*([\"'])(.*?)\\1","i"))?.[2]??null;
  const heroImage=heroTag?{persona:heroMatch[2],src:attr(heroTag,"src"),loading:attr(heroTag,"loading"),fetchPriority:attr(heroTag,"fetchpriority")}:null;
  return {decodedHtmlBytes:Buffer.byteLength(html),cssLinks:links,blockingCssLinks,heroImage,
    highPriorityImages:preloads.filter(x=>/\bas=["']image["']/i.test(x)&&/fetchpriority=["']high["']/i.test(x))
      .map(x=>x.match(/\bhref=["']([^"']+)/i)?.[1]).filter(Boolean)};
}
export function assertHeroPreload(data,path="/"){
  // The current Home scene is hidden by the approved hero CSS. A pine
  // preload is no longer required; it cannot substitute for the real portrait.
  const hero=data.heroImage;
  assert.ok(hero,"Approved SSR persona image missing: "+path);
  assert.equal(hero.loading,"eager","Hero image must load eagerly: "+path);
  assert.equal(hero.fetchPriority,"high","Hero image priority missing: "+path);
  if(hero.src?.startsWith("data:")){
    assert.ok(hero.persona==="alex"&&inlineSamir&&hero.src===inlineSamir,"Inline hero must be the exact approved small Samir WebP: "+path);
  }else{
    assert.ok(/^\/images\/holistic-house\/(?:ali-inner-alchemist-hero\.webp|my-coach-motion\/[a-z0-9_-]+\.webp)$/i.test(hero.src??""),"Approved SSR persona image missing: "+path);
    assert.ok(data.highPriorityImages.includes(hero.src),"Actual SSR hero image preload missing: "+path);
  }
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
    assertHeroPreload(data,path);
    list.push({path,htmlBytes:data.decodedHtmlBytes,cssFiles:unique.length,cssBytes,
      blockingCssFiles:new Set(data.blockingCssLinks).size,
      heroImage:data.heroImage.src.startsWith("data:")?{...data.heroImage,src:samirPath,delivery:"inline-approved-webp"}:data.heroImage,
      highPriorityImages:data.highPriorityImages});
  }
  console.log(JSON.stringify({origin:origin.origin,source:"built-Next-local",note:"CSS and HTML decoded bytes are uncompressed; blockingCssFiles excludes print-media sheets and noscript fallbacks; these are not Lighthouse times",pages:list},null,2));
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href)
  main().catch(e=>{console.error(e);process.exitCode=1});
