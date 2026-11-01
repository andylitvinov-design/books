// Trusted review policy: distinguish signed receipts from actual independent review.
// Signatures attest identity/integrity, not correctness. Caller must validate source.
export function validateReviewReceipt(receipt,{featureId,headSha,baseSha,authorId,trustedReviewerId}={}){
 if(!receipt||receipt.featureId!==featureId||receipt.headSha!==headSha||receipt.baseSha!==baseSha)return {ok:false,reason:'stale-or-mismatched-receipt'};
 if(!trustedReviewerId||receipt.reviewerId!==trustedReviewerId||receipt.reviewerId===authorId)return {ok:false,reason:'reviewer-not-independent'};
 if(receipt.decision!=='LAB_ACCEPTED'||!receipt.evidenceId)return {ok:false,reason:'review-not-accepted'};
 if(!Array.isArray(receipt.checks)||!receipt.checks.length||receipt.checks.some(x=>x?.status!=='passed'||!x?.runUrl))return {ok:false,reason:'checks-unverified'};
 if(receipt.findings?.some(x=>x?.severity==='blocking'&&x?.resolved!==true))return {ok:false,reason:'blocking-findings'};
 return {ok:true,reason:'review-receipt-eligible-for-signature'};
}
