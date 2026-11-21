import assert from "node:assert/strict";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const locales = ["en", "ru", "es"];
const stages = ["before", "after"];
const runs = [1, 2];
const median = values => {
  const sorted = [...values].sort((a, b) => a - b);
  return (sorted[0] + sorted[1]) / 2;
};

export function summarizeLighthouse(lhr) {
  assert.ok(lhr && typeof lhr === "object", "Lighthouse JSON missing");
  assert.match(lhr.lighthouseVersion || "", /^13\./, "Expected Lighthouse v13 to compare like-for-like");
  const audits = lhr.audits ?? {};
  const number = id => {
    const value = audits[id]?.numericValue;
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  };
  const perf = lhr.categories?.performance?.score;
  assert.ok(typeof perf === "number" && Number.isFinite(perf), "No valid Lighthouse performance score");
  const details = audits.metrics?.details?.items?.[0] ?? {};
  const observedLoad = details.observedLoad;
  // CLS is unitless and its 0.1 good threshold needs more precision than ms.
  const getValue = id => number(id) === null ? null : +number(id).toFixed(id === "cumulative-layout-shift" ? 4 : 1);
  return {
    version: lhr.lighthouseVersion,
    requestedUrl: lhr.requestedUrl,
    performance: +(100 * perf).toFixed(0),
    fcpMs: getValue("first-contentful-paint"),
    lcpMs: getValue("largest-contentful-paint"),
    cls: getValue("cumulative-layout-shift"),
    tbtMs: getValue("total-blocking-time"),
    speedIndexMs: getValue("speed-index"),
    observedLoadEventMs: Number.isFinite(observedLoad) ? +observedLoad.toFixed(1) : null,
    // Simulated throttling does NOT provide a reliable browser load-event
    // measurement under a real physical slow-4G connection.
    settings: {
      formFactor: lhr.configSettings?.formFactor ?? null,
      throttlingMethod: lhr.configSettings?.throttlingMethod ?? null,
      throttling: lhr.configSettings?.throttling ?? null,
    },
  };
}

export function summarizePair(before, after) {
  assert.equal(before.length, 2, "Two baseline runs required");
  assert.equal(after.length, 2, "Two candidate runs required");
  for (const data of [...before, ...after]) {
    assert.equal(data.settings.formFactor, "mobile", "Only mobile runs count");
    assert.equal(data.settings.throttlingMethod, "simulate", "Same simulated slow-4G conditions required");
    assert.ok(data.lcpMs != null && data.fcpMs != null && data.cls != null, "Incomplete Lighthouse metrics");
  }
  const result = {};
  for (const metric of ["performance", "fcpMs", "lcpMs", "cls", "tbtMs", "speedIndexMs"]) {
    const oldValue = median(before.map(x => x[metric]));
    const newValue = median(after.map(x => x[metric]));
    result[metric] = { before: +oldValue.toFixed(2), after: +newValue.toFixed(2),
      delta: +(newValue - oldValue).toFixed(2) };
  }
  result.mobileTargets = {
    performance90: result.performance.after >= 90,
    fcpUnder1800: result.fcpMs.after < 1800,
    lcpUnder2500: result.lcpMs.after < 2500,
    clsUnder01: result.cls.after < 0.1,
  };
  return result;
}

async function main() {
  const directory = process.argv[2] ?? "artifacts/home-perf";
  const pages = {};
  for (const locale of locales) {
    const results = {};
    for (const stage of stages) {
      results[stage] = runs.map(run =>
        summarizeLighthouse(JSON.parse(readFileSync(directory + "/" + stage + "-" + locale + "-" + run + ".json", "utf8"))));
    }
    pages[locale] = { beforeRuns: results.before, afterRuns: results.after,
      summary: summarizePair(results.before, results.after) };
  }
  const output = {
    measuredAt: new Date().toISOString(), method: "Lighthouse 13.6 mobile simulated slow 4G, two consecutive runs per URL and build",
    caveat: "ObservedLoadEventMs is NOT a simulated slow-4G full-page-load metric; full load <5s needs a separate real 4G browser observation.",
    pages,
  };
  const file = directory + "/comparison.json";
  writeFileSync(file, JSON.stringify(output, null, 2));
  const table = ["## Matched mobile slow-4G Lighthouse (two runs per URL)",
    "| Locale | Perf before → PR | FCP before → PR (ms) | LCP before → PR (ms) | CLS before → PR | Score≥90 / FCP<1.8s / LCP<2.5s / CLS<0.1 |",
    "|:--|--:|--:|--:|--:|:--"];
  for (const locale of locales) {
    const s = pages[locale].summary;
    const text = key => s[key].before + " → " + s[key].after;
    const target = Object.values(s.mobileTargets).every(Boolean) ? "PASS" : "NOT ALL MET";
    table.push("| " + locale + " | " + text("performance") + " | " + text("fcpMs") + " | " +
      text("lcpMs") + " | " + text("cls") + " | " + target + " |");
  }
  table.push("", "**Measured on the same GitHub runner with equal Lighthouse mobile simulated 4G configuration.**",
    "This is not CrUX real-user data. No comparable actual slow-4G window.onload was measured; do not report a made-up full-load value.",
    "No paid Vercel previews, synthetic forms, payments or private routes were used.");
  console.log(table.join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, table.join("\n") + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => { console.error(err); process.exitCode = 1; });
}
