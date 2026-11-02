import assert from "node:assert/strict";
import {writeFileSync,mkdirSync} from "node:fs";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {chromium,webkit}=require(process.env.HH_PLAYWRIGHT_PACKAGE||"playwright");
const origin=process.env.HH_PUBLIC_QA_ORIGIN||"http://127.0.0.1:3100";
const address=new URL(origin);
if(!["127.0.0.1","localhost"].includes(address.hostname)||
  !["http:","https:"].includes(address.protocol))
  throw Error("MyTube QA requires isolated local server");
const folder="artifacts/mytube-mobile";
mkdirSync(folder,{recursive:true});
const evidence=[];
async function verify(engine,locale,width){
  const browser=await engine.launch({headless:true});
  const context=await browser.newContext({viewport:{width,height:850},deviceScaleFactor:1,
    locale:locale==="ru"?"ru-RU":locale==="es"?"es-ES":"en-US"});
  const page=await context.newPage();
  const label=engine.name()+":"+locale+":"+width;
  try{
    await page.goto(origin+"/"+locale+"/mytube",{waitUntil:"domcontentloaded",timeout:75000});
    await page.locator("[data-mytube-page]").waitFor({timeout:45000});
    await page.locator('[data-discovery-variant="mytube"]').waitFor({timeout:45000});
    assert.equal(await page.locator("[data-video-life-area]").count(),4,label+" life areas");
    const cards=page.locator('[data-video-layout="mytube"] article');
    assert.ok((await cards.count())>0,label+" published videos missing");
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    assert.ok(overflow<=2,label+" horizontal overflow "+overflow);
    const area=page.locator('[data-video-life-area="energy_health"]');
    await area.click();
    assert.equal(await area.getAttribute("aria-pressed"),"true");
    const search=page.locator("[data-mytube-search]");
    await search.fill("Tantra Reiki");
    assert.ok((await cards.count())>=1,label+" real search result");
    await search.fill("");
    await area.click();
    const first=cards.first();
    const frame=await first.locator('[class*="visual"]').first().boundingBox();
    assert.ok(frame&&Math.abs(frame.width/frame.height-16/9)<0.23,label+" 16:9 thumbnail");
    assert.equal(await page.locator('iframe[src*="youtube-nocookie.com"]').count(),0);
    await first.locator('button').first().click();
    await page.locator('iframe[src*="youtube-nocookie.com/embed/"]').first().waitFor({timeout:10000});
    if(engine===webkit&&locale==="ru"&&width===390)
      await page.screenshot({path:folder+"/mytube-webkit-ru-390.png",fullPage:false});
    evidence.push({browser:engine.name(),locale,width,overflow,clickedVideo:true});
  }finally{await context.close();await browser.close();}
}
for(const locale of ["ru","en","es"]){
  for(const width of [320,390,430])await verify(webkit,locale,width);
  await verify(chromium,locale,390);
}
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(origin+"/ru/holistic-support/mandala",{waitUntil:"domcontentloaded",timeout:75000});
  await page.locator('[data-video-quick-control="mytube"]').waitFor({timeout:45000});
  assert.equal(await page.locator('[data-video-quick-controls] > *').count(),7);
  await page.locator('[data-video-quick-control="mytube"]').click();
  await page.waitForURL(/\/ru\/mytube\/?$/,{timeout:25000});
  await page.locator("[data-mytube-page]").waitFor({timeout:25000});
  evidence.push({action:"Seventh Video Studio button opens MyTube",result:"pass"});
}finally{await browser.close();}
writeFileSync(folder+"/results.json",JSON.stringify(evidence,null,2));
console.log("MyTube mobile browser QA passed",evidence.length);
