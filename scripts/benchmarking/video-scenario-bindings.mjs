#!/usr/bin/env node
/**
 * Post-FFprobe editorial backlog for all 120 canonical scenarios.
 * Does NOT approve scenes or change the live Auto Director. Requires the
 * anonymous, independently verified MP4 inventory from video-catalog-probe.
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VIDEO_GOAL_SCENARIOS,VIDEO_GOAL_TOPICS,auditVideoGoalTaxonomy} from '../../lib/mandala/video-goal-taxonomy.mjs';
import {auditScenarioMediaCandidates} from '../../lib/mandala/video-scenario-bindings.mjs';
import {inspectVerifiedVideoAsset} from '../../lib/mandala/verified-asset-resolver.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export const OUTPUT_RELATIVE='artifacts/benchmarking/video-scenario-candidates.json';
const fail=()=>{throw Error('VIDEO_SCENARIO_CANDIDATE_AUDIT_FAILED');};

export function auditCanonicalVideoScenarioCandidates({scenes,evidence}){
  const taxonomy=auditVideoGoalTaxonomy();
  if(taxonomy.ok!==true||taxonomy.scenarios!==120||
     !Array.isArray(scenes)||scenes.length<44||new Set(scenes.map(s=>s.id)).size!==scenes.length||
     evidence?.status!=='pass'||evidence?.schemaVersion!=='hh-verified-assets-v1'||
     evidence?.assets?.length!==scenes.length||
     new Set(evidence.assets.map(x=>x.id)).size!==scenes.length)fail();
  // Evidence must match the *actual* exact scene paths/hashes for all 44.
  // Merely declaring status=pass is never sufficient proof.
  if(scenes.some(scene=>inspectVerifiedVideoAsset(scene,evidence).status!=='technical_ready'))fail();
  const report=auditScenarioMediaCandidates({
    scenarios:VIDEO_GOAL_SCENARIOS,topics:VIDEO_GOAL_TOPICS,scenes,evidence,
  });
  if(report.count!==120||report.rows.some(row=>row.canExport!==false||
     row.sourceStatus!=='unbound'||row.beats.length!==4)||
     report.summary.executableScenarioCount!==0||
     report.summary.fullyEditorialApproved!==0||
     report.summary.awaitingVerifiedMedia!==0)fail();
  return report;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  if(args.some(a=>!['--check','--json'].includes(a)))fail();
  const evidence=JSON.parse(readFileSync(resolve(ROOT,
    'artifacts/benchmarking/verified-video-assets.json'),'utf8'));
  const catalog=JSON.parse(readFileSync(resolve(ROOT,
    'data/video-catalog/scene-taxonomy.json'),'utf8'));
  const result=auditCanonicalVideoScenarioCandidates({scenes:catalog.scenes,evidence});
  const output=resolve(ROOT,OUTPUT_RELATIVE);
  mkdirSync(dirname(output),{recursive:true});
  writeFileSync(output,JSON.stringify(result,null,2)+'\n');
  const summary={count:result.count,summary:result.summary,
    output:OUTPUT_RELATIVE,allScenariosRemainUnbound:true};
  process.stdout.write(JSON.stringify(summary,null,args.includes('--json')?0:2)+'\n');
}
