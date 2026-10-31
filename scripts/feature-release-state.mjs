// Deterministic release status model; no GitHub/Vercel writes.
const valid=new Set(['LOCAL','LAB_QA','RELEASE_CANDIDATE','GITHUB_CI','MERGED','LIVE','BLOCKED']);
export function advanceFeature(feature,evidence={}){
 const state=feature?.state||'LOCAL';
 if(!valid.has(state))return {state:'BLOCKED',reason:'unknown-state'};
 if(state==='LOCAL')return evidence.labReady&&evidence.isolated?'LAB_QA':{state:'LOCAL',reason:'lab-not-ready'};
 if(state==='LAB_QA')return evidence.qaPassed&&evidence.testEvidence?'RELEASE_CANDIDATE':{state:'LAB_QA',reason:'qa-incomplete'};
 if(state==='RELEASE_CANDIDATE')return evidence.prNumber&&evidence.prHeadSha&&evidence.productionBaseVerified?'GITHUB_CI':{state:'RELEASE_CANDIDATE',reason:'pr-not-ready'};
 if(state==='GITHUB_CI')return evidence.exactHeadGreen&&evidence.applicableChecksGreen&&evidence.mergeAllowed&&evidence.mergedSha?'MERGED':{state:'GITHUB_CI',reason:'release-gate-incomplete'};
 if(state==='MERGED')return evidence.productionReadySha===evidence.mergedSha&&evidence.liveSmokePassed?'LIVE':{state:'MERGED',reason:'live-not-verified'};
 return state;
}
