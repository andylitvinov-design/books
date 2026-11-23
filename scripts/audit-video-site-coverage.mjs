#!/usr/bin/env node
/**
 * One read-only, source-backed inventory for Video Studio, MyTube and site placements.
 *
 * node scripts/audit-video-site-coverage.mjs --json --aspect=portrait
 * node scripts/audit-video-site-coverage.mjs --csv=topics --aspect=landscape
 * node scripts/audit-video-site-coverage.mjs --csv=studio
 * node scripts/audit-video-site-coverage.mjs --csv=queue
 * node scripts/audit-video-site-coverage.mjs --csv=sites
 * node scripts/audit-video-site-coverage.mjs --strict
 *
 * No Cloudflare, Supabase, YouTube, user analytics, external API or writes.
 */
import {auditVideoSiteCoverage} from "../lib/video-library/coverage.mjs";
const args=process.argv.slice(2);
const csvArgs=args.filter(a=>a.startsWith("--csv="));
const aspectArgs=args.filter(a=>a.startsWith("--aspect="));
const allowed=/^(--json|--strict|--aspect=(portrait|landscape|square)|--csv=(topics|studio|queue|sites|categories))$/;
if(args.some(a=>!allowed.test(a))||csvArgs.length>1||aspectArgs.length>1||
  (csvArgs.length&&args.includes("--json")))throw Error("INVALID_COVERAGE_CLI_OPTIONS");
const report=auditVideoSiteCoverage({
  aspect:aspectArgs[0]?.slice("--aspect=".length)||"portrait",
});
if(args.includes("--strict")){
  const x=report.summary,i=report.inventory;
  if(x.mytubeCategories!==4||x.mytubeSubcategories!==16||x.mytubeTopics!==64||
    x.studioTopics!==30||x.studioScenarios!==120||x.studioShots!==480||
    i.localLicensedCatalogRows<48||i.proceduralAnimationCatalogRows<684||
    i.duplicatePaths!==0||!report.mapping.valid)
    throw Error("VIDEO_COVERAGE_SCHEMA_OR_IDENTITY_REGRESSION");
}
const escapeCsv=v=>{
  const s=Array.isArray(v)?v.join(";"):String(v??"");
  const safe=/^[=+\-@\t\r]/.test(s)?"'"+s:s;
  return /[,"\r\n]/.test(safe)?'"'+safe.replace(/"/g,'""')+'"':safe;
};
const table=(records,fields)=>{
  process.stdout.write(fields.join(",")+"\n");
  for(const r of records)process.stdout.write(fields.map(k=>escapeCsv(r[k])).join(",")+"\n");
};
if(csvArgs.length){
  const collection=csvArgs[0].split("=")[1];
  if(collection==="topics")table(report.topics,[
    "categoryId","subcategoryId","topicId","topicLabel","aspect",
    "taggedCandidateCount","primaryTaggedCount","hasFourTopicTaggedOptions",
    "frameVerifiedClipCount","verifiedStoryboards","readyForRealFootageExport","evidence"]);
  if(collection==="studio")table(report.studioTopics,[
    "studioCategoryId","studioTopicId","relatedMyTubeTopicIds",
    "relatedTopicsWithTaggedOptions","shotCount","mediaBoundShotCount",
    "readyForRealFootageExport","evidence"]);
  if(collection==="queue")table(report.sourcingQueue,[
    "categoryId","topicId","topicLabel","aspect","taggedOptions",
    "optionsShortOfFour","priority","stage","approvedForImport"]);
  if(collection==="sites")table(report.sites,["id","route","source","state"]);
  if(collection==="categories")table(report.categories,[
    "id","label","totalTopics","topicsWithAnyTaggedOption",
    "topicsWithFourTaggedOptions","topicsWithoutTaggedOptions","evidence"]);
}else if(args.includes("--json"))process.stdout.write(JSON.stringify(report,null,2)+"\n");
else process.stdout.write(JSON.stringify({
  schemaVersion:report.schemaVersion,aspect:report.aspect,
  inventory:report.inventory,summary:report.summary,
  categoryCoverage:report.categories,topSourcingNeeds:report.sourcingQueue.slice(0,20),
  sitePlacementSummary:report.sites,
},null,2)+"\n");
