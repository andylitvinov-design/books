/**
 * Audit/export the exact five-motif assignments for all 256 MyTube scenarios.
 * Run: node scripts/audit-mytube-creative-choices.mjs [--csv|--json]
 * Read-only: stdout only, no API, asset download, billing or file mutation.
 */
import {getMyTubeTaxonomy} from "../lib/mandala/mytube-content-taxonomy.mjs";
import {listMyTubeScenarioMotifs,auditMyTubeCreativeChoices} from "../lib/mandala/mytube-creative-choices.mjs";

const report=auditMyTubeCreativeChoices();
if(!report.ok){
  console.error(JSON.stringify(report,null,2));
  process.exitCode=1;
}else{
  const rows=[];
  for(const category of getMyTubeTaxonomy().categories)
    for(const subcategory of category.subcategories)
      for(const topic of subcategory.topics)
        for(const scenario of topic.scenarios){
          const motifs=listMyTubeScenarioMotifs(scenario.id,"ru");
          rows.push({
            categoryId:category.id,subcategoryId:subcategory.id,
            topicId:topic.id,scenarioId:scenario.id,
            scenario:scenario.label.ru,archetype:scenario.archetype,
            motifIds:motifs.map(row=>row.id),
            motifNames:motifs.map(row=>row.label),
          });
        }
  if(rows.length!==256||rows.some(row=>row.motifIds.length!==5))
    throw new Error("MYTUBE_SCENARIO_MOTIF_MAPPING_INCOMPLETE");
  const fmt=process.argv[2]||"";
  if(!fmt){
    console.log(JSON.stringify({
      status:"editorial_not_finished_media",...report.counts,
      distinctScenarioMappings:new Set(rows.map(row=>row.motifIds.join("|"))).size,
      instruction:"Use --csv or --json for all 256 five-motif assignments.",
    },null,2));
  }else if(fmt==="--json"){
    console.log(JSON.stringify({schemaVersion:"hh-mytube-scenario-motifs-v1",
      status:"editorial_not_finished_media",report,rows},null,2));
  }else if(fmt==="--csv"){
    const escaped=value=>'"'+String(value??"").replaceAll('"','""')+'"';
    console.log(["categoryId","subcategoryId","topicId","scenarioId","scenarioRu","archetype",
      "motif1Id","motif2Id","motif3Id","motif4Id","motif5Id"].map(escaped).join(","));
    for(const row of rows)console.log([
      row.categoryId,row.subcategoryId,row.topicId,row.scenarioId,row.scenario,row.archetype,
      ...row.motifIds,
    ].map(escaped).join(","));
  }else{
    console.error("Expected --csv, --json, or no flag.");
    process.exitCode=2;
  }
}
