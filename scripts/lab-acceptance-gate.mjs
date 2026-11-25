// Acceptance is evidence validation, not a second CI run.
// Never trust developer-supplied booleans without independently sourced receipts.
const sha=x=>typeof x==='string'&&/^[a-f0-9]{40}$/i.test(x);
export function acceptLabFeature(feature, evidence){
 if(!feature||!evidence||!sha(feature.headSha))return {accepted:false,reason:'invalid-feature'};
 const head=feature.headSha.toLowerCase();
 if(!Array.isArray(feature.criteria)||!feature.criteria.length)return {accepted:false,reason:'missing-criteria'};
 if(!Array.isArray(evidence.tests)||!evidence.tests.length)return {accepted:false,reason:'missing-test-receipts'};
 if(!feature.criteria.every(c=>typeof c==='string'&&c.trim().length>0&&evidence.criteria?.[c]?.passed===true&&evidence.criteria[c].sha?.toLowerCase()===head))return {accepted:false,reason:'acceptance-criteria-unverified'};
 if(!evidence.tests.every(t=>t?.status==='passed'&&t.sha?.toLowerCase()===head&&typeof t.runId==='string'&&t.runId.length>0&&t.source!=='developer-claim'))return {accepted:false,reason:'tests-unverified'};
 const review=evidence.independentReview;
 if(review?.status!=='passed'||review.sha?.toLowerCase()!==head||!review.reviewerId||review.reviewerId===feature.authorId||!review.evidenceId)return {accepted:false,reason:'independent-review-missing'};
 if(evidence.security?.status!=='passed'||evidence.security.sha?.toLowerCase()!==head)return {accepted:false,reason:'security-unverified'};
 if(feature.requiresBrowser===true&&(!evidence.browser||evidence.browser.status!=='passed'||evidence.browser.sha?.toLowerCase()!==head))return {accepted:false,reason:'browser-unverified'};
 return {accepted:true,reason:'lab-accepted',headSha:feature.headSha,reviewEvidenceId:review.evidenceId};
}
