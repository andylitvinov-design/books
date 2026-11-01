// Pure release queue planner. Does not push, create PRs, or bypass GitHub gates.
// Grouping is deliberately disabled until single-feature release has been proven.
export function planReleaseQueue(items,{now=Date.now(),maxActivePr=2,activePrCount=0,existingPrs=[]}={}){
 if(!Array.isArray(items)||!Array.isArray(existingPrs))throw Error('Queue or PR inventory unavailable');
 if(!Number.isSafeInteger(activePrCount)||activePrCount<0)throw Error('Invalid active PR count');
 if(activePrCount>=maxActivePr)return {action:'HOLD',reason:'capacity',candidates:[]};
 const candidates=[];
 for(const item of items){
  if(item?.status!=='RELEASE_CANDIDATE'||!/^LAB-[1-9][0-9]*$/.test(item.id||''))continue;
  if(item.qaPassed!==true||item.testEvidence!==true)continue;
  if(!/^[a-f0-9]{40}$/i.test(item.headSha||'')||!/^[a-f0-9]{40}$/i.test(item.baseSha||''))continue;
  if(item.productionBaseSha!==item.baseSha)continue;
  if(item.targetBranch!=='codex/public-book-library')continue;
  if(existingPrs.some(pr=>pr?.state==='open'&&(pr.labId===item.id||pr.headSha===item.headSha)))continue;
  candidates.push(item);
 }
 candidates.sort((a,b)=>Date.parse(a.readyAt||'')-Date.parse(b.readyAt||'')||a.id.localeCompare(b.id));
 const selected=candidates[0];
 if(!selected)return {action:'HOLD',reason:'no-verified-candidate',candidates:[]};
 return {action:'HANDOFF_ONE',reason:'single-feature-pilot',candidates:[{id:selected.id,headSha:selected.headSha,baseSha:selected.baseSha,targetBranch:selected.targetBranch}]};
}
