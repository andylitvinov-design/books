/**
 * Guest Loved Ones Voices smoke on real Chromium and WebKit.
 * Feature OFF by default: synthetic-only, no uploads, no provider or payment.
 */
import assert from "node:assert/strict";
import {chromium,webkit,expect} from "@playwright/test";

const origin=(process.env.HH_TEST_PUBLIC_ORIGIN||"http://127.0.0.1:3100").replace(/\/$/,"");
const scenarios=[["ru",320],["ru",390],["ru",430],["en",390],["es",390]];
const engines=[["chromium",chromium],["webkit",webkit]];
for(const [name,kind] of engines){
  const browser=await kind.launch({headless:true});
  try {
    for(const [locale,width] of scenarios){
      const context=await browser.newContext({viewport:{width,height:820}});
      try{
        const page=await context.newPage();
        const failures=[];
        const posts=[];
        page.on("pageerror",e=>failures.push(e.message));
        page.on("request",req=>{
          if(req.method()==="POST"&&req.url().includes("loved-voices"))posts.push(req.url());
        });
        const phrase=locale==="ru"?"Я рядом.":locale==="en"?"I am supported.":"Estoy aquí.";
        const response=await page.goto(origin+"/"+locale+"/holistic-support/loved-voices#t="+encodeURIComponent(phrase),{waitUntil:"domcontentloaded",timeout:45000});
        assert.equal(response?.status(),200,name+":"+locale);
        const block=page.locator("[data-loved-voice-mvp]");
        await expect(block).toBeVisible({timeout:20000});
        assert.equal(await block.locator('input[type="file"]').count(),2);
        assert.equal(await page.locator("[data-loved-voice-consent-text]").count(),1);
        await expect(page.locator("[data-loved-voice-generate]")).toBeDisabled();
        await expect(page.locator("textarea")).toHaveValue(phrase);
        await page.locator("textarea").fill(phrase);
        const checkbox=block.getByRole("checkbox");
        assert.equal(await checkbox.count(),2);
        await checkbox.nth(0).check();
        await checkbox.nth(1).check();
        await expect(page.locator("[data-loved-voice-generate]")).toBeDisabled();
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
        assert.ok(overflow<=2,name+":"+locale+":"+width+" overflow="+overflow);
        assert.deepEqual(posts,[],name+" no provider request");
        assert.deepEqual(failures,[],name+" browser console");
      }finally{await context.close();}
    }
  }finally{await browser.close();}
}
console.log("Loved Ones Voices synthetic guest disabled-state mobile smoke succeeded");
