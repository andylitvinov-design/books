import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

// Lighthouse 13.x final-screenshot is an ACTUAL viewport screenshot from the
// same baseline/candidate slow-4G audits, not a manufactured visual mock.
export function screenshotBytes(lhr) {
  const uri = lhr?.audits?.["final-screenshot"]?.details?.data;
  if (typeof uri !== "string") return null;
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(uri);
  if (!match) return null;
  return { bytes: Buffer.from(match[2], "base64"), ext: match[1] === "jpeg" ? "jpg" : match[1] };
}

export async function pixelDiffRatio(original, candidate) {
  const [a, b] = await Promise.all([original, candidate].map(buffer =>
    sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
  if (a.info.width !== b.info.width || a.info.height !== b.info.height)
    return { comparable: false, before: [a.info.width,a.info.height], after: [b.info.width,b.info.height] };
  let diff = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    if (Math.abs(a.data[i] - b.data[i]) > 2 ||
        Math.abs(a.data[i+1] - b.data[i+1]) > 2 ||
        Math.abs(a.data[i+2] - b.data[i+2]) > 2) diff++;
  }
  return { comparable: true, width: a.info.width, height: a.info.height,
    changedPixelRatio: +(diff/(a.info.width*a.info.height)).toFixed(6),
    pixelIdentical: diff===0 };
}

async function main() {
  const dir = process.argv[2] || "artifacts/home-perf";
  const report = { method:"Lighthouse 13.6 final viewport screenshot, same mobile Chrome / simulated slow-4G", locales:{} };
  for(const locale of ["en","ru","es"]) {
    const shots = {};
    for(const stage of ["before","after"]) {
      const lhr=JSON.parse(readFileSync(`${dir}/${stage}-${locale}-1.json`,"utf8"));
      const image=screenshotBytes(lhr);
      if (!image) throw new Error(`Missing Lighthouse final screenshot: ${stage} ${locale}`);
      const path=`${dir}/${stage}-${locale}-mobile.${image.ext}`;
      writeFileSync(path,image.bytes);
      shots[stage]={ path, sha256:createHash("sha256").update(image.bytes).digest("hex"), image };
    }
    report.locales[locale]={
      before:shots.before.path, after:shots.after.path,
      comparison:await pixelDiffRatio(shots.before.image.bytes,shots.after.image.bytes)
    };
  }
  writeFileSync(dir+"/screenshot-comparison.json",JSON.stringify(report,null,2));
  console.log("Mobile first-screen screenshot evidence: "+JSON.stringify(report));
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href)
  main().catch(error=>{console.error(error);process.exitCode=1});
