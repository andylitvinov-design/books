import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
const sources = ["mobile", "desktop"];
const output = {};
for (const mode of sources) {
  const data = JSON.parse(readFileSync("artifacts/lighthouse-" + mode + ".json", "utf8"));
  const audits = data.audits ?? {};
  output[mode] = {
    fetchTime: data.fetchTime, requestedUrl: data.requestedUrl, finalUrl: data.finalUrl,
    lighthouseVersion: data.lighthouseVersion,
    performance: Math.round(100 * (data.categories.performance?.score ?? 0)),
    seo: Math.round(100 * (data.categories.seo?.score ?? 0)),
    lcpMs: audits["largest-contentful-paint"]?.numericValue ?? null,
    cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
    tbtMs: audits["total-blocking-time"]?.numericValue ?? null,
    fcpMs: audits["first-contentful-paint"]?.numericValue ?? null,
    inpMs: audits["interaction-to-next-paint"]?.numericValue ?? null,
    opportunities: Object.values(audits)
      .filter(a => a.details?.type === "opportunity" && a.details?.overallSavingsMs > 100)
      .sort((a,b) => b.details.overallSavingsMs - a.details.overallSavingsMs)
      .slice(0, 8).map(a => ({ id: a.id, title: a.title, savingsMs: Math.round(a.details.overallSavingsMs) })),
  };
}
writeFileSync("artifacts/lighthouse-summary.json", JSON.stringify(output,null,2));
console.log(JSON.stringify(output,null,2));
if(process.env.GITHUB_STEP_SUMMARY) {
  const lines = ["## Lighthouse — Holistic House /",    "Lab performance only. INP may not be available; do not invent field data.",
    "| Metric | Mobile | Desktop |", "| --- | ---: | ---: |",
    ...[["Performance","performance"],["SEO","seo"],["LCP (ms)","lcpMs"],["CLS","cls"],["TBT (ms)","tbtMs"],["INP (ms; if available)","inpMs"]].map(([label,key]) => "| "+label+" | "+(output.mobile[key] ?? "N/A")+" | "+(output.desktop[key] ?? "N/A")+" |")];
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join("\n")+"\n");
}
