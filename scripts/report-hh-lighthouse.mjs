import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
const sources = ["mobile", "desktop", "services-mobile", "remedy-mobile"];
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
// These are Lighthouse lab observations, not 75th-percentile real-user CWV.
// INP is reported only when available; never infer it from TBT.
const mobileModes = ["mobile", "services-mobile", "remedy-mobile"];
output.mobileThresholds = Object.fromEntries(mobileModes.map(mode => {
  const page = output[mode];
  const lcpGood = page.lcpMs === null ? null : page.lcpMs < 2500;
  const clsGood = page.cls === null ? null : page.cls < 0.1;
  return [mode, { maxLcpMs: 2500, maxCls: 0.1, lcpGood, clsGood,
    labPass: lcpGood === true && clsGood === true }];
}));
writeFileSync("artifacts/lighthouse-summary.json", JSON.stringify(output,null,2));
console.log(JSON.stringify(output,null,2));
if(process.env.GITHUB_STEP_SUMMARY) {
  const lines = ["## Lighthouse — Holistic House /",    "Lab performance only. INP may not be available; do not invent field data.",
    "| Metric | Mobile | Desktop |", "| --- | ---: | ---: |",
    ...[["Performance","performance"],["SEO","seo"],["LCP (ms)","lcpMs"],["CLS","cls"],["TBT (ms)","tbtMs"],["INP (ms; if available)","inpMs"]].map(([label,key]) => "| "+label+" | "+(output.mobile[key] ?? "N/A")+" | "+(output.desktop[key] ?? "N/A")+" |")];
  lines.push("", "## Other mobile routes (lab only)", "| Page | Performance | SEO | LCP ms | CLS | LCP & CLS target |", "| --- | ---: | ---: | ---: | ---: | --- |");
  for (const mode of mobileModes) {
    const item = output[mode], target = output.mobileThresholds[mode];
    lines.push("| "+mode+" | "+item.performance+" | "+item.seo+" | "+(item.lcpMs ?? "N/A")+" | "+(item.cls ?? "N/A")+" | "+(target.labPass ? "pass" : "needs improvement")+" |");
  }
  lines.push("**Note:** Two consecutive 'Good' real-user CWV readings require sufficient Chrome UX Report or Speed Insights field traffic. Lighthouse is not a substitute.");
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join("\n")+"\n");
}
