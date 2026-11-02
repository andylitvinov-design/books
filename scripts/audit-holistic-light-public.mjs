#!/usr/bin/env node
// On-demand public-page Design Bible audit — no account cookies, no private data.
// Reuses the existing safe public-page browser capture and its PNG evidence.
import {mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {parseCaptureArgs,capturePublicPage} from "./capture-public-ui-reference.mjs";
import {auditPublicSnapshot} from "../lib/design/holistic-light-qa.mjs";

export function parseDesignAuditArgs(argv) {
  // Keep the whitelist and private/URL defenses in the existing capture parser.
  return parseCaptureArgs(argv);
}
export async function runDesignAudit(argv) {
  const opts=parseDesignAuditArgs(argv);
  const snapshot=await capturePublicPage(opts);
  const report=auditPublicSnapshot(snapshot);
  await mkdir(opts.out,{recursive:true});
  const slug=opts.route.replaceAll("/","-").replace(/^-+/,"");
  const path=resolve(opts.out,"design-qa-"+opts.browser+"-"+opts.width+"-"+slug+".json");
  await writeFile(path,JSON.stringify({
    ...report,origin:opts.origin,route:opts.route,browser:opts.browser,
    publicGuestOnly:true,referenceScreenshotRequiredForFidelity:true,
  },null,2)+"\n");
  console.log("Holistic Light "+report.outcome+" "+opts.route+" "+opts.browser+
    "/"+opts.width+"px; critical="+report.critical.length+
    " review="+report.review.length+"; evidence="+path);
  if(report.critical.length) process.exitCode=1;
  return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  runDesignAudit(process.argv.slice(2)).catch(error=>{
    console.error("Design QA capture failed: "+error.message);
    process.exitCode=2;
  });
}
