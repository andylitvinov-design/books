import {ownerMaterialRequest} from '@/lib/clients/material-library-http';
import {privateJson} from '@/lib/clients/delivery-http';
import {transaction,consumeRate,closeDatabase} from '@/lib/app/database';
import {readCandidateRightsDossier,validCandidateDossierId}
  from '@/lib/automations/candidate-rights-dossier.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const maxDuration=30;

/** Owner-only read-only research packet; never licence approval or media delivery. */
export async function GET(request){
  try{return await ownerMaterialRequest(request,async({config})=>{
    const search=new URL(request.url).searchParams;
    if([...search.keys()].some(key=>key!=='candidateId')||
       search.getAll('candidateId').length!==1||
       !validCandidateDossierId(search.get('candidateId')))
      return privateJson({error:'INVALID_CANDIDATE_ID'},400);
    await consumeRate(config,'owner-candidate-rights-dossier',20,60);
    const dossier=await transaction(config,null,
      db=>readCandidateRightsDossier(db,search.get('candidateId')),{server:true});
    if(!dossier)return privateJson({error:'SHORTLIST_REVIEW_REQUIRED'},404);
    return privateJson(dossier);
  });}finally{await closeDatabase();}
}
