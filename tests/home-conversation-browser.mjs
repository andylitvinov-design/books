import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, webkit } from "@playwright/test";
import {verifyProgramHome} from "../scripts/verify-program-home.mjs";

// Exercises the actual built Next.js homepage without a user account, provider,
// speech permission, personal data, outbound messages, or external paid API.
const engineName = process.env.HH_TEST_BROWSER || "chromium";
assert.ok(["chromium", "webkit"].includes(engineName), "Invalid browser");
const browserType = engineName === "webkit" ? webkit : chromium;
const port = 3187;
const host = "http://127.0.0.1:" + port;
let logs = "";
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "--hostname", "127.0.0.1"], {
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});
for (const stream of [server.stdout, server.stderr]) {
  stream.on("data", part => { logs = (logs + part.toString()).slice(-25000); });
}
const evidence = { browser: engineName, cases: [] };
mkdirSync("artifacts/home-conversation", { recursive: true });

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error("Next server exited early: " + logs.slice(-2000));
    try {
      const response = await fetch(host, { signal: AbortSignal.timeout(2500) });
      if (response.ok) return;
    } catch { /* Next may still be warming up. */ }
    await delay(450);
  }
  throw new Error("Next server was not ready: " + logs.slice(-2000));
}
let browser;
try{
 await waitForServer();
 browser=await browserType.launch();
 for(const [locale,path] of [["en","/"],["ru","/ru"],["es","/es"]]){
  for(const width of [320,375,390,430]){
   const context=await browser.newContext({viewport:{width,height:820},serviceWorkers:"block"});
   const page=await context.newPage();
   const errors=[],writes=[];
   page.on("pageerror",error=>errors.push(error.message));
   await page.route("**/api/**",route=>{
    const request=route.request();
    if(request.method()==="GET"||request.method()==="HEAD")return route.continue();
    writes.push(new URL(request.url()).pathname);
    return route.abort();
   });
   try{
    const response=await page.goto(host+path,{waitUntil:"domcontentloaded",timeout:30000});
    assert.equal(response.status(),200);
    const result=await verifyProgramHome(page,{locale,width});
    assert.deepEqual(writes.filter(path=>/lead|coaching|messages|checkout|telegram|whatsapp/.test(path)),[],"Program browsing must not send requests or start a session");
    assert.deepEqual(errors,[]);
    evidence.cases.push(result);
    if(width===390)await page.screenshot({path:"artifacts/home-conversation/"+engineName+"-"+locale+".png"});
   }finally{await context.close()}
  }
 }
 console.log(JSON.stringify(evidence,null,2));
}finally{
 writeFileSync("artifacts/home-conversation/"+engineName+".json",JSON.stringify({...evidence,serverLogs:logs.slice(-3000)},null,2));
 if(browser)await browser.close();
 server.kill("SIGTERM");
}
