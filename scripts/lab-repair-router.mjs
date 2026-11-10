// Lab repair ownership and bounded retry policy. Pure decision logic.
export function planLabRepair({featureId,authorId,reviewerId,headSha,findings=[],attempts=0}={}){
 if(!/^LAB-[1-9][0-9]*$/.test(featureId||''))return {action:'HOLD',reason:'invalid-feature'};
 if(!/^[a-f0-9]{40}$/i.test(headSha||''))return {action:'HOLD',reason:'missing-head-sha'};
 if(!authorId||!reviewerId||authorId===reviewerId)return {action:'HOLD',reason:'independent-review-required'};
 if(!Array.isArray(findings))return {action:'HOLD',reason:'findings-unavailable'};
 const blocking=findings.filter(f=>f?.blocking===true&&f?.sha===headSha&&typeof f?.id==='string'&&f.id.length>0);
 if(!blocking.length)return {action:'ACCEPTANCE_RECHECK',reason:'no-blocking-findings',owner:reviewerId};
 if(!Number.isSafeInteger(attempts)||attempts<0)return {action:'HOLD',reason:'invalid-attempts'};
 if(attempts>=3)return {action:'ESCALATE',reason:'repair-attempt-limit',owner:'lab-coordinator',blockingIds:blocking.map(f=>f.id)};
 return {action:'REPAIR',reason:'blocking-qa-findings',owner:authorId,reviewer:reviewerId,headSha,blockingIds:blocking.map(f=>f.id),nextAttempt:attempts+1};
}
