#!/usr/bin/env node
/**
 * Read-only operator coverage audit: 4×16×64×256, 1,280 suggested motifs,
 * approved, aspect-compatible source clips. No downloads, cloud calls or writes.
 *
 * node scripts/audit-mytube-media-coverage.mjs
 * node scripts/audit-mytube-media-coverage.mjs --json --aspect=portrait
 * node scripts/audit-mytube-media-coverage.mjs --csv
 * node scripts/audit-mytube-media-coverage.mjs --queue --aspect=landscape
 */
import catalog from "../data/video-catalog/scene-taxonomy.json" with {type:"json"};
import {auditMyTubeMediaCoverage} from "../lib/mandala/mytube-media-coverage.mjs";

const args=process.argv.slice(2);
const allowed=new Set(["--json","--csv","--queue","--strict"]);
const aspectArg=args.find(x=>x.startsWith("--aspect="));
if(args.some(x=>!allowed.has(x)&&!/^--aspect=(portrait|landscape|square)$/.test(x))||
   ["--json","--csv","--queue"].filter(x=>args.includes(x)).length>1)
  throw Error("unsupported_mytube_coverage_report_option");
const aspect=aspectArg?.split("=")[1]||"portrait";
const result=auditMyTubeMediaCoverage({scenes:catalog.scenes,aspect});
if(args.includes("--strict")&&
   (result.tree.scenarios!==256||result.tree.recommendedMotifPlacements!==1280||
    result.tree.visualMotifs!==46||result.tree.visualStyles!==10||
    result.footageInventory.distinctVideoPaths!==result.footageInventory.eligibleLocalLicensedCatalogRows))
  throw Error("mytube_media_coverage_invariant_failure");
const csvValue=value=>{
  const str=String(value??"");
  return /[,"\n\r]/.test(str)?'"'+str.replace(/"/g,'""')+'"':str;
};
if(args.includes("--csv")){
  const names=["categoryId","subcategoryId","topicId","scenarioId","motifId",
    "candidateCount","motifTaggedCount","fourSourceTaggedReady","sourceTagStatus"];
  process.stdout.write(names.join(",")+"\n");
  for(const row of result.scenarioMotifs)
    process.stdout.write(names.map(k=>csvValue(row[k])).join(",")+"\n");
}else if(args.includes("--queue")){
  process.stdout.write(JSON.stringify({
    schemaVersion:result.schemaVersion,aspect,summary:result.summary,
    explanation:"Sourcing briefs only; zero new originals implied; each requires individual review, rights and physical R2 readback.",
    queued:result.sourcingQueue,
  },null,2)+"\n");
}else if(args.includes("--json")){
  process.stdout.write(JSON.stringify(result,null,2)+"\n");
}else{
  process.stdout.write(JSON.stringify({
    schemaVersion:result.schemaVersion,aspect,
    evidenceLevel:result.evidenceLevel,
    inventory:result.footageInventory,
    tree:result.tree,summary:result.summary,
    topUncoveredMotifs:result.motifs.filter(m=>!m.catalogTaggedClipCount).map(m=>m.motifId),
    nextSourcingBriefs:result.sourcingQueue.slice(0,20),
  },null,2)+"\n");
}
