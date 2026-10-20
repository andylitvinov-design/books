// Read-only production browser QA for public SEO entry pages. No login,
// form submission, client identifiers or private URL navigation.
// Run: node scripts/verify-public-tests-mobile.mjs
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const origin = (process.env.HH_SEO_AUDIT_ORIGIN || "https://holistichouse.vercel.app").replace(/\/$/, "");
const locales = ["en", "ru", "es"];
const widths = [320, 390, 430];
const height = 844;
const results = [];
const failures = [];
const outputDir = "artifacts/seo-tests-mobile";
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });

try {
  for (const locale of locales) {
    for (const width of widths) {
      const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
        locale: locale === "ru" ? "ru-RU" : locale === "es" ? "es-ES" : "en-CA",
      });
      const page = await context.newPage();
      const path = "/" + locale + "/tests";
      const label = locale + "-" + width;
      const violations = [];
      const check = (ok, reason) => { if (!ok) violations.push(reason); };
      try {
        const response = await page.goto(origin + path, { waitUntil: "domcontentloaded", timeout: 35000 });
        check(response?.status() === 200, "HTTP status should be 200");
        check(page.url() === origin + path, "Unexpected redirect URL");
        await page.locator('link[rel="canonical"]').first().waitFor({ state: "attached", timeout: 12000 });
        await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
        const snapshot = await page.evaluate(() => {
          const heading = document.querySelector("main h1");
          const intro = heading?.parentElement?.querySelectorAll("p")?.[1] || null;
          const source = document.documentElement;
          const primary = document.querySelector('main section a[href$="/client/tests"]');
          const secondary = document.querySelector('main section a[href$="/services/free-situation-review"]');
          const rect = primary?.getBoundingClientRect();
          const alternates = Object.fromEntries(
            [...document.querySelectorAll('link[rel="alternate"][hreflang]')]
              .map(link => [link.getAttribute("hreflang"), link.getAttribute("href")]),
          );
          return {
            lang: source.lang,
            title: document.title,
            description: document.querySelector('meta[name="description"]')?.getAttribute("content") || "",
            canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "",
            alternates,
            h1Count: document.querySelectorAll("main h1").length,
            h1Text: heading?.textContent?.trim() || "",
            h1FontPx: heading ? parseFloat(getComputedStyle(heading).fontSize) : 0,
            introFontPx: intro ? parseFloat(getComputedStyle(intro).fontSize) : 0,
            primaryHref: primary?.getAttribute("href") || "",
            secondaryHref: secondary?.getAttribute("href") || "",
            primaryHeight: rect?.height || 0,
            primaryVisible: !!(rect && rect.width > 0 && rect.height > 0),
            overflowPixels: Math.max(source.scrollWidth, document.body.scrollWidth) - window.innerWidth,
            robots: [...document.querySelectorAll('meta[name="robots"],meta[name="googlebot"]')]
              .map(meta => meta.getAttribute("content") || "").join(","),
          };
        });
        check(snapshot.lang === locale, "Wrong document language: " + snapshot.lang);
        check(snapshot.h1Count === 1 && snapshot.h1Text.length >= 12, "Missing or duplicate H1");
        check(snapshot.h1FontPx >= 28, "Mobile H1 too small: " + snapshot.h1FontPx);
        check(snapshot.introFontPx >= 15, "Intro too small: " + snapshot.introFontPx);
        check(snapshot.title.length >= 20, "Short/empty title");
        check(snapshot.description.length >= 80 && snapshot.description.length <= 170,
          "Description missing or too long: " + snapshot.description.length);
        check(snapshot.canonical === origin + path, "Canonical not self-referencing");
        check(!/\bnoindex\b/i.test(snapshot.robots) &&
          !/\bnoindex\b/i.test(response?.headers()["x-robots-tag"] || ""),
          "Public landing unexpectedly noindex");
        for (const language of [...locales, "x-default"]) {
          const expected = origin + "/" + (language === "x-default" ? "en" : language) + "/tests";
          check(snapshot.alternates[language] === expected,
            "Wrong " + language + " alternate: " + (snapshot.alternates[language] || "missing"));
        }
        check(snapshot.primaryHref === "/" + locale + "/client/tests", "Primary test CTA missing");
        check(snapshot.secondaryHref === "/" + locale + "/services/free-situation-review", "Written review CTA missing");
        check(snapshot.primaryVisible && snapshot.primaryHeight >= 44,
          "Test CTA is hidden or smaller than 44px: " + snapshot.primaryHeight);
        check(snapshot.overflowPixels <= 1, "Horizontal overflow " + snapshot.overflowPixels + "px");
        await page.screenshot({
          path: outputDir + "/" + label + ".png",
          fullPage: width === 390,
          animations: "disabled",
          timeout: 20000,
        });
        results.push({ locale, width, ...snapshot, violations });
      } catch (error) {
        violations.push("Browser check: " + String(error?.message || error).slice(0, 300));
        results.push({ locale, width, violations });
      }
      for (const violation of violations) failures.push(label + ": " + violation);
      await context.close();
    }
  }
} finally {
  await browser.close();
}

const output = {
  timestamp: new Date().toISOString(),
  origin,
  commit: process.env.GITHUB_SHA || null,
  tested: results.length,
  passed: failures.length === 0,
  failures,
  results,
  note: "Chromium viewport emulation, not an actual iPhone or evidence of Google indexing",
};
await writeFile(outputDir + "/report.json", JSON.stringify(output, null, 2) + "\n");
console.log(JSON.stringify({ ...output, results: results.map(r => ({
  locale: r.locale, width: r.width, h1: r.h1Text,
  canonical: r.canonical, overflowPixels: r.overflowPixels, violations: r.violations,
})) }, null, 2));
if (failures.length) process.exitCode = 1;
