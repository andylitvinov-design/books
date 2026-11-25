import {ownerMaterialRequest} from "@/lib/clients/material-library-http";
import {privateJson} from "@/lib/clients/delivery-http";
import {auditStoryPhotoCoverage} from "@/lib/video-library/story-photo-audit.mjs";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request){
 return ownerMaterialRequest(request,async()=>{
  if(new URL(request.url).searchParams.size)
   return privateJson({error:"BAD_STORY_PHOTO_AUDIT_QUERY"},400);
  return privateJson(auditStoryPhotoCoverage());
 });
}
