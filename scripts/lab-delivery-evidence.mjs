// Normalize independently verified GitHub and Vercel facts into a delivery event.
// Inputs must be retrieved from authoritative APIs by the caller.
const sha=s=>typeof s==='string'&&/^[a-f0-9]{40}$/i.test(s);
export function classifyDelivery({pr,productionDeployment,smoke}={}){
 if(!pr||!Number.isSafeInteger(pr.number)||pr.number<1||!sha(pr.headSha))return {state:'UNVERIFIED',reason:'missing-pr-evidence'};
 if(pr.merged!==true||!sha(pr.mergeSha)||!pr.mergedAt)return {state:'GITHUB_CI',reason:'not-merged'};
 if(!productionDeployment||productionDeployment.readyState!=='READY'||productionDeployment.target!=='production'||!sha(productionDeployment.sha))return {state:'MERGED',reason:'production-not-ready'};
 if(productionDeployment.sha.toLowerCase()!==pr.mergeSha.toLowerCase())return {state:'MERGED',reason:'production-sha-mismatch'};
 if(smoke?.passed!==true||smoke?.sha?.toLowerCase()!==pr.mergeSha.toLowerCase())return {state:'MERGED',reason:'live-smoke-missing'};
 return {state:'LIVE',reason:'verified',prNumber:pr.number,sha:pr.mergeSha,mergedAt:pr.mergedAt,deployedAt:productionDeployment.readyAt};
}
