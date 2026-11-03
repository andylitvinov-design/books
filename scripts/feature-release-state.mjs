// Pure release decision model. Never performs GitHub or Vercel writes.
export const STATES=Object.freeze(['LOCAL','LAB_QA','RELEASE_CANDIDATE','GITHUB_CI','MERGED','LIVE','BLOCKED']);
const sha=x=>typeof x==='string'&&/^[a-f0-9]{40}$/i.test(x);
const blocked=(state,reason)=>({state,reason});
export function advanceFeature(feature={},evidence={}){
 const state=feature.state??'LOCAL';
 if(!STATES.includes(state))return blocked('BLOCKED','unknown-state');
 if(state==='BLOCKED'||state==='LIVE')return blocked(state,'terminal-state');
 if(state==='LOCAL')return evidence.labReady===true&&evidence.isolated===true?blocked('LAB_QA','lab-ready'):blocked(state,'lab-not-ready');
 if(state==='LAB_QA')return evidence.qaPassed===true&&evidence.testEvidence===true?blocked('RELEASE_CANDIDATE','qa-verified'):blocked(state,'qa-incomplete');
 if(state==='RELEASE_CANDIDATE')return Number.isSafeInteger(evidence.prNumber)&&evidence.prNumber>0&&sha(evidence.prHeadSha)&&evidence.productionBaseVerified===true?blocked('GITHUB_CI','pr-verified'):blocked(state,'pr-not-ready');
 if(state==='GITHUB_CI')return evidence.exactHeadGreen===true&&evidence.applicableChecksGreen===true&&evidence.mergeAllowed===true&&evidence.mergedAtVerified===true&&sha(evidence.mergedSha)&&sha(evidence.prHeadSha)?blocked('MERGED','merge-verified'):blocked(state,'release-gate-incomplete');
 if(state==='MERGED')return sha(evidence.mergedSha)&&sha(evidence.productionReadySha)&&evidence.productionReadySha.toLowerCase()===evidence.mergedSha.toLowerCase()&&evidence.liveSmokePassed===true?blocked('LIVE','live-verified'):blocked(state,'live-not-verified');
 return blocked('BLOCKED','unhandled-state');
}
