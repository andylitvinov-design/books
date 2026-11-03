// Browser acceptance for public visual landing templates; never submits leads.
// Same-origin isolated production Next instance only, Chromium + Safari/WebKit.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) {
  throw new Error("Landing matrix browser QA only runs against isolated loopback.");
}
const dir = "artifacts/visual-service-mobile";
await mkdir(dir, { recursive: true });
const cases = [
  ["/en/services/alchemy-of-soul","[data-alchemy-visual-screen]","[data-alchemy-visual-screen=\"final-capture\"]",390],
  ["/ru/services/alchemy-of-soul","[data-alchemy-visual-screen]","[data-alchemy-visual-screen=\"final-capture\"]",320],
  ["/en/services/business-consulting","[data-business-visual-screen]","[data-business-visual-screen=\"final-capture\"]",390],
  ["/es/services/business-consulting","[data-business-visual-screen]","[data-business-visual-screen=\"final-capture\"]",430],
  ["/en/services/personal-support","[data-support-visual-screen]","[data-support-visual-screen=\"final-capture\"]",390],
  ["/en/services/free-situation-review","[data-free-visual-screen]","[data-free-visual-screen=\"final-capture\"]",390],
  ["/es/services/dao-health-profile","[data-free-visual-screen]","[data-free-visual-screen=\"final-capture\"]",390],
  ["/en/academy/coaching/egyptian","[data-tradition-visual-screen]","[data-tradition-visual-screen=\"final-capture\"]",390],
  ["/ru/academy/coaching/greek","[data-tradition-visual-screen]","[data-tradition-visual-screen=\"final-capture\"]",390],
  ["/en/academy/reiki/free-practitioner-course","[data-reiki-visual-screen]","[data-reiki-visual-screen=\"final-capture\"]",390],
  ["/en/courses/antistress","[data-antistress-visual-screen]","[data-antistress-visual-screen=\"final-capture\"]",390],
];
const results = [];
for (const engine of [chromium,webkit]) {
  const browser = await engine.launch();
  try {
    for (const [path,stageSelector,finalSelector,width] of cases) {
      const label = engine.name()+":"+path+":"+width;
      const page = await browser.newPage({viewport:{width,height:844},hasTouch:true,reducedMotion:"reduce"});
      const errors = [];
      page.on("pageerror",err=>errors.push(err.message));
      try {
        const response = await page.goto(origin+path,{waitUntil:"domcontentloaded",timeout:60000});
        assert.equal(response?.status(),200,label+" real public route");
        const screens = page.locator(stageSelector);
        await screens.first().waitFor({state:"visible",timeout:22000});
        const count=await screens.count();
        assert.ok(count>=2,label+" expected photo/step screens");
        const final=page.locator(finalSelector);
        assert.equal(await final.count(),1,label+" one final capture screen");
        assert.ok(await final.locator("img").count()>0,label+" capture has approved photo");
        assert.ok(await final.locator('input[type="checkbox"]').count()===1,
          label+" explicit reply consent");
        assert.ok(await final.locator('input:not([type="checkbox"])').count()>0,
          label+" contact input");
        assert.equal(await page.locator("[data-sitewide-capture]:visible").count(),0,
          label+" no duplicate global form");
        const docWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
        assert.ok(docWidth<=width+2,label+" no horizontal overflow "+docWidth);
        const first=await screens.first().locator("img").first();
        if (await first.count()) {
          await first.scrollIntoViewIfNeeded();
          await first.evaluate(img=>new Promise((resolve,reject)=>{
            if(img.complete){resolve(img.naturalWidth)} else {
              img.addEventListener("load",()=>resolve(img.naturalWidth),{once:true});
              img.addEventListener("error",()=>reject(new Error("media failed to load")),{once:true});
            }
          })).then(w=>assert.ok(w>32,label+" photo actually loads"));
        }
        const heights=[];
        for(let i=0;i<count;i++){
          const item=screens.nth(i);
          const box=await item.boundingBox();
          if (box && box.height && box.width) {
            assert.ok(box.width<=width+2,label+" section "+i+" too wide");
            heights.push(Math.round(box.height));
          }
        }
        const submit=final.locator('button[type="submit"]');
        if (await submit.count()) assert.ok(await submit.isDisabled(),label+" consent not preselected");
        assert.deepEqual(errors,[],label+" hydration / JS errors");
        if (engine===webkit && width===390 && /alchemy-of-soul|business-consulting|personal-support|antistress/.test(path)) {
          await final.scrollIntoViewIfNeeded();
          await page.screenshot({path:dir+"/"+path.split("/").filter(Boolean).slice(-1)[0]+"-final-webkit.png"});
        }
        results.push({label,count,width,heights,form:true});
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
}
await writeFile(dir+"/landing-matrix.json",JSON.stringify(results,null,2));
console.log("PASS public landing matrix: "+results.length+" Chromium/WebKit routes, no submission.");
