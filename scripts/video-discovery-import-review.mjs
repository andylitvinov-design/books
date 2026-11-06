#!/usr/bin/env node
// Offline owner-reviewed input -> quarantined JSON candidates.
// Example: node scripts/video-discovery-import-review.mjs public-sources.json > review.json
// NO provider API, DB writes, private videos, secrets, downloads or publication.
import {readFileSync} from "node:fs";
import {normalizeVideoCandidate} from "../lib/video-discovery/curation.mjs";
const input=process.argv[2];
if(!input||process.argv.length!==3){
  process.stderr.write("Usage: node scripts/video-discovery-import-review.mjs input.json > review.json\n");
  process.exitCode=2;
}else{
  try{
    const content=readFileSync(input);
    if(content.length>1024*1024)throw Error("INPUT_TOO_LARGE");
    const parsed=JSON.parse(content.toString("utf8"));
    if(!Array.isArray(parsed)||parsed.length>100)throw Error("EXPECTED_MAX_100_RECORDS");
    const seen=new Set(),accepted=[],rejected=[];
    for(const [index,source] of parsed.entries()){
      const result=normalizeVideoCandidate(source);
      if(!result.ok){rejected.push({index,reason:result.error});continue;}
      if(seen.has(result.candidate.youtube_id))continue;
      seen.add(result.candidate.youtube_id);
      accepted.push(result.candidate);
    }
    process.stdout.write(JSON.stringify({status:"candidate_only",accepted,rejected},null,2)+"\n");
  }catch(error){
    process.stderr.write("Review import stopped: "+(error instanceof Error?error.message:"unknown")+"\n");
    process.exitCode=1;
  }
}
