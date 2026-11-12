/** Immutable public library coverage -> short strategic question for owner-only Council 4+1. */
export const COUNCIL_TASK_ID='council-video-review-weekly';
export const COUNCIL_POLICY='hh-council-planner-v1';
const HOUR=3600000;
export function councilIsDue(slotUtc){
 const n=Date.parse(slotUtc);if(!Number.isFinite(n))return false;
 const d=new Date(n);return d.getUTCDay()===1&&d.getUTCHours()===7&&d.getUTCMinutes()===17;
}
export function buildCouncilCoverageQuestion(coverage,{previous=[]}={}){
 const queue=Array.isArray(coverage?.sourcingQueue)?coverage.sourcingQueue:[];
 const gaps=queue.filter(row=>Number.isFinite(row?.optionsShortOfFour)&&row.optionsShortOfFour>0)
   .slice(0,8).map(row=>({category:row.categoryId,topic:row.topicId,optionsShortOfFour:row.optionsShortOfFour}));
 const safePrevious=Array.isArray(previous)?previous.slice(0,4).map(x=>({state:x.state,kind:x.kind})):[];
 const msg=[
   'Holistic House: Council weekly VIDEO SOURCE RESEARCH only. No clinical, private or customer data.',
   'Evaluate public video catalogue gaps and propose up to 3 source-search priorities. Do NOT claim media viewed or licenses approved. No new providers, spending, workflows, changes to production, or downloads.',
   'Return 1-3 specific search-oriented, evidence-grounded actions with tests. The owner decides; no execution.',
   'PUBLIC_COVERAGE='+JSON.stringify(gaps),
   'PREVIOUS_PROPOSAL_OUTCOMES='+JSON.stringify(safePrevious),
 ].join('\n');
 return msg.slice(0,1750);
}
export function normalizeCouncilProposal(result){
 if(result?.status!=='ok'||result.synthesis?.status!=='ok')return null;
 const parsed=result.synthesis.parsed;
 if(!parsed||!Array.isArray(parsed.actions)||parsed.actions.length<1)return null;
 const clean=(s,n)=>typeof s==='string'?s.trim().slice(0,n):'';
 const actions=parsed.actions.slice(0,3).filter(a=>clean(a.step,230).length>=12&&clean(a.check,230).length>=12)
   .map(a=>({step:clean(a.step,230),why:clean(a.why,230),check:clean(a.check,230)}));
 if(!actions.length)return null;
 return {answer:clean(parsed.answer,1200),actions,unknowns:(Array.isArray(parsed.unknowns)?parsed.unknowns:[])
   .slice(0,3).map(x=>clean(x,220)),source:'council_4_plus_1',
   rightsApproved:false,publishAuthorized:false,ownerApprovalRequired:true};
}
