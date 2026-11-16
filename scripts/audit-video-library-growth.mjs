#!/usr/bin/env node
/**
 * Read-only, locally reproducible sourcing plan.
 *
 * node scripts/audit-video-library-growth.mjs             # concise inventory
 * node scripts/audit-video-library-growth.mjs --queue     # 320 sourcing briefs
 * node scripts/audit-video-library-growth.mjs --json      # full machine JSON
 * node scripts/audit-video-library-growth.mjs --target=500
 *
 * Never calls a provider or publishes unreviewed footage.
 */
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve,dirname,join} from "node:path";
import {planVideoLibraryGrowth,VIDEO_LIBRARY_TARGET} from "../lib/mandala/video-library-growth.mjs";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const load=path=>JSON.parse(readFileSync(join(root,path),"utf8"));
const args=process.argv.slice(2);
if(args.some(a=>!["--queue","--json"].includes(a)&&!/^--target=\d+$/.test(a)))
  throw Error("unsupported_video_library_audit_option");
const targetOption=args.find(a=>a.startsWith("--target="));
const target=targetOption?Number(targetOption.split("=")[1]):VIDEO_LIBRARY_TARGET;
const report=planVideoLibraryGrowth({
  catalog:load("data/video-catalog/scene-taxonomy.json"),
  publishedSourceRecords:load("data/video-catalog/free-stock-scenes.json"),
  candidateManifests:[
    load("data/video-catalog/dareful-verified-candidate-wave-20261101.json"),
    load("data/video-catalog/dareful-verified-candidate-wave2-20261101.json"),
    load("data/video-catalog/dareful-verified-candidate-wave3-20261103.json"),
  ],
  mytube:load("data/video-catalog/mytube-content-taxonomy-4x4x4-v1.json"),
  target,
});
if(args.includes("--json")){
  process.stdout.write(JSON.stringify(report,null,2)+"\n");
}else if(args.includes("--queue")){
  process.stdout.write(JSON.stringify({status:report.publicationStatus,
    queue:report.proposedSourceBriefs,pendingReview:report.pendingUnapprovedNotCounted},null,2)+"\n");
}else{
  const {proposedSourceBriefs,pendingUnapprovedNotCounted,...summary}=report;
  process.stdout.write(JSON.stringify(summary,null,2)+"\n");
}
