import {ownerMaterialRequest} from '@/lib/clients/material-library-http';
import {privateJson} from '@/lib/clients/delivery-http';
import {transaction,consumeRate,closeDatabase} from '@/lib/app/database';
import {reviewResearchCandidate,validateCandidateEditorialAction}
 from '@/lib/automations/candidate-editorial-review.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const maxDuration=30;

export async function POST(request){
  try{return await ownerMaterialRequest(request,async({config,data})=>{
    if(new URL(request.url).search)return privateJson({error:'INVALID_REVIEW_QUERY'},400);
    try{validateCandidateEditorialAction(data)}
    catch{return privateJson({error:'INVALID_CANDIDATE_REVIEW'},400)}
    await consumeRate(config,'owner-candidate-editorial-review',12,60);
    const review=await transaction(config,null,
      db=>reviewResearchCandidate(db,data),{server:true});
    return privateJson(review,review.status==='not_found'?404:200);
  },{body:true});}finally{await closeDatabase()}
}
