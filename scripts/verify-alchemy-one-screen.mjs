// Isolated public-only geometry QA. No account, playback, clicks or provider sends.
// Run against the current PR's loopback Next production server, never against live.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");

const origin = process.env.HH_PUBLIC_QA_ORIGIN || "http://127.0.0.1:3100";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error("Alchemy QA requires an isolated loopback server");

const chapters = ["featured-video", "hero", "situations", "method", "report", "video", "reviews", "formats", "faq", "request"];
const cases = [
  ...["en", "ru", "es"].flatMap(locale => [320, 375, 390, 430].map(width => ({ locale, width, height: 844 }))),
  { locale: "en", width: 320, height: 568 },
  { locale: "ru", width: 320, height: 568 },
  { locale: "es", width: 320, height: 568 },
  { locale: "en", width: 390, height: 667 },
];
const report = [];
const failures = [];
const browser = await chromium.launch();
try {
  for (const {locale,width,height} of cases) {
    const page = await browser.newPage({viewport:{width,height}});
    const key = locale + "/" + width + "x" + height;
    try {
      const response = await page.goto(origin + "/" + locale + "/services/alchemy-of-soul", {waitUntil:"networkidle",timeout:45000});
      assert.equal(response?.status(), 200, key + ": route must return HTTP 200");
      const root = page.locator('main[data-core-service-detail="alchemy"]');
      await root.locator('h1').waitFor({state:"visible",timeout:30000});
      const data = await root.evaluate((node) => {
        const viewport = innerWidth;
        const panels = Array.from(node.querySelectorAll("[data-alchemy-panel]"), section => {
          const rect = section.getBoundingClientRect();
          const visual = section.getAttribute("data-alchemy-visual");
          const photo = section.querySelector("img");
          const video = section.querySelector(".site-video-player");
          const overflow = Array.from(section.querySelectorAll("a,button,summary,h1,h2,h3,img,article,.site-video-player"))
            .filter(el => {
              const s = getComputedStyle(el), r = el.getBoundingClientRect();
              return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0;
            }).filter(el => {
              const r = el.getBoundingClientRect();
              return r.left < -1 || r.right > viewport + 1;
            }).length;
          return {
            name: section.getAttribute("data-alchemy-panel"),
            visual, hasMedia: visual === "photo" ? Boolean(photo) : Boolean(video),
            height: Math.ceil(rect.height), width: Math.ceil(rect.width),
            maxHeight: innerHeight - 80, escapingChildren: overflow
          };
        });
        return {documentWidth: document.documentElement.scrollWidth,viewportWidth: innerWidth,viewportHeight: innerHeight,panels};
      });
      const issues = [];
      if (data.documentWidth > width + 1) issues.push("horizontal document overflow " + data.documentWidth);
      if (data.panels.length !== chapters.length) issues.push("expected ten chapters, got " + data.panels.length);
      for (let i=0;i<data.panels.length;i++) {
        const p=data.panels[i];
        if (p.name !== chapters[i]) issues.push("incorrect chapter order "+i+":"+p.name);
        if (!p.hasMedia) issues.push(p.name+" missing "+p.visual);
        if (p.height > p.maxHeight) issues.push(p.name+" "+p.height+"px exceeds "+p.maxHeight+"px");
        if (p.escapingChildren) issues.push(p.name+" has "+p.escapingChildren+" escaping controls/content");
      }
      if (!data.panels.some(p => p.name === "report" && p.hasMedia))
        issues.push("public fictional report sample must include a visible photo");
      if (await root.locator('[data-alchemy-method-sequence] li').count() !== 4)
        issues.push("all four method stages must be visible without expanding details");
      if (await root.locator('[data-alchemy-report-example] .does-not-exist').count() !== 0)
        issues.push("report placeholder unexpectedly found");
      const reportLink = await root.locator('a[href="/' + locale + '/services/alchemy-of-soul/example-report"]').count();
      if (reportLink !== 1) issues.push("example report route link missing");
      report.push({locale,width,height,...data,issues});
      if (issues.length) {
        failures.push(key+": "+issues.join("; "));
        console.error("ALCHEMY_GEOMETRY_FAIL "+key+" "+issues.join("; "));
      } else {
        console.log("PASS Alchemy "+key+" ten photographed/video chapters fit with no overflowing controls");
      }
      const sampleResponse = await page.goto(origin + "/" + locale + "/services/alchemy-of-soul/example-report", {waitUntil:"domcontentloaded",timeout:45000});
      assert.equal(sampleResponse?.status(),200,key+": sample report");
      assert.equal(await page.locator('[data-alchemy-example-report="fictional"]').count(),1,key+": no private client data");
    } catch (error) {
      failures.push(key+": "+String(error));
      console.error("ALCHEMY_QA_ERROR "+key+" "+String(error));
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
const destination="artifacts/public-services-production";
await mkdir(destination,{recursive:true});
await writeFile(destination+"/alchemy-one-screen-geometry.json", JSON.stringify({cases:report,failures},null,2)+"\n");
assert.deepEqual(failures, [], "Alchemy viewport acceptance: "+failures.join(" | "));
