import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

// Compare actual Lighthouse captures, not reconstructed or masked images.
export function screenshotBytes(lhr, kind = "viewport") {
  const uri = kind === "viewport" ? lhr?.audits?.["final-screenshot"]?.details?.data
    : lhr?.fullPageScreenshot?.screenshot?.data;
  if (typeof uri !== "string") return null;
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(uri);
  if (!match) return null;
  return { bytes: Buffer.from(match[2], "base64"), ext: match[1] === "jpeg" ? "jpg" : match[1] };
}

export async function pixelDiffRatio(original, candidate) {
  const [a, b] = await Promise.all([original, candidate].map(buffer =>
    sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
  if (a.info.width !== b.info.width || a.info.height !== b.info.height)
    return { comparable: false, before: [a.info.width,a.info.height], after: [b.info.width,b.info.height], pixelIdentical: false };
  const {width,height}=a.info;
  let diff=0, exact=0, left=width, top=height, right=0, bottom=0;
  for (let i=0;i<a.data.length;i+=4) {
    const delta=Math.max(...[0,1,2,3].map(k=>Math.abs(a.data[i+k]-b.data[i+k])));
    if (delta>0) exact++;
    if (delta<=2) continue;
    diff++;
    const p=i/4, x=p%width, y=Math.floor(p/width);
    left=Math.min(left,x); top=Math.min(top,y); right=Math.max(right,x+1); bottom=Math.max(bottom,y+1);
  }
  return { comparable:true,width,height,changedPixelRatio:+(diff/(width*height)).toFixed(6),
    exactChangedPixelRatio:+(exact/(width*height)).toFixed(6),pixelIdentical:exact===0,
    changedPixelBounds:diff?{left,top,right,bottom}:null };
}

export function timingEvidence(lhr) {
  const audits=lhr?.audits??{}, breakdown=audits["lcp-breakdown-insight"]?.details?.items??[];
  const metric=audits.metrics?.details?.items?.[0]??{};
  return {simulatedLcpMs:audits["largest-contentful-paint"]?.numericValue??null,
    observedLcpMs:metric.observedLargestContentfulPaint??null,
    observedLcpSubparts:breakdown.find(x=>x.type==="table")?.items??[],
    lcpNode:breakdown.find(x=>x.type==="node")??null,
    estimatedBlockingCssSavingsMs:audits["render-blocking-insight"]?.metricSavings?.LCP??null,
    unusedCssBytes:(audits["unused-css-rules"]?.details?.items??[]).reduce((sum,x)=>sum+(x.wastedBytes??0),0)};
}

async function main() {
  const dir=process.argv[2]||"artifacts/home-perf";
  const report={method:"Lighthouse 13.6 actual final viewport and full-page captures, two runs per locale. No masks; animation frame differences are reported, never waived. Observed LCP subparts are not the simulated LCP.",locales:{}};
  for(const locale of ["en","ru","es"]) {
    const pairs=[];
    for(const run of [1,2]) {
      const pair={run};
      const reports={};
      for(const stage of ["before","after"]) reports[stage]=JSON.parse(readFileSync(dir+"/"+stage+"-"+locale+"-"+run+".json","utf8"));
      for(const kind of ["viewport","full-page"]) {
        const shots={};
        for(const stage of ["before","after"]) {
          const image=screenshotBytes(reports[stage],kind);
          if(!image) throw Error("Missing Lighthouse "+kind+" screenshot: "+stage+" "+locale+" "+run);
          const path=dir+"/"+stage+"-"+locale+"-"+run+"-"+kind+"."+image.ext;
          writeFileSync(path,image.bytes);
          shots[stage]={path,sha256:createHash("sha256").update(image.bytes).digest("hex"),image};
        }
        pair[kind]={before:shots.before.path,after:shots.after.path,beforeSha256:shots.before.sha256,afterSha256:shots.after.sha256,
          comparison:await pixelDiffRatio(shots.before.image.bytes,shots.after.image.bytes)};
      }
      pair.timing={before:timingEvidence(reports.before),after:timingEvidence(reports.after)};
      pairs.push(pair);
    }
    report.locales[locale]={pairs,allViewportPixelIdentical:pairs.every(p=>p.viewport.comparison.pixelIdentical),allFullPagePixelIdentical:pairs.every(p=>p["full-page"].comparison.pixelIdentical)};
  }
  writeFileSync(dir+"/screenshot-comparison.json",JSON.stringify(report,null,2));
  console.log("All-run screenshot evidence: "+JSON.stringify(Object.fromEntries(Object.entries(report.locales).map(([locale,value])=>[locale,value.pairs.map(p=>({run:p.run,viewport:p.viewport.comparison,fullPage:p["full-page"].comparison}))]))));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
  main().catch(error=>{console.error(error);process.exitCode=1});
