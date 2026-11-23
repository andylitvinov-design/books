import {requireAdminRequest} from "@/lib/prescriptions/admin";
import {getAppConfig,requireSameOrigin} from "@/lib/app/config";
import {
 listOwnerStudioMusic,prepareOwnerStudioMusic,completeOwnerStudioMusic,
 ownerStudioMusicPreview,publishOwnerStudioMusic,retireOwnerStudioMusic
} from "@/lib/mandala/studio-music-library-server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store, max-age=0",
 "X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex, nofollow, noarchive"};
const json=(data,status=200)=>Response.json(data,{status,headers});
const allow=(x,keys)=>x&&typeof x==="object"&&!Array.isArray(x)&&
 Object.keys(x).every(key=>keys.includes(key));
export async function GET(){
 if(!await requireAdminRequest())return json({error:"NOT_FOUND"},404);
 try{return json(await listOwnerStudioMusic(getAppConfig()))}
 catch{return json({error:"MUSIC_STORAGE_UNAVAILABLE"},503)}
}
export async function POST(request){
 if(!await requireAdminRequest())return json({error:"NOT_FOUND"},404);
 let body,config;
 try{
  config=getAppConfig();requireSameOrigin(request,config);
  if(!request.headers.get("content-type")?.startsWith("application/json"))
   return json({error:"INVALID_ACTION"},415);
  const text=await request.text();
  if(text.length>1600)return json({error:"INVALID_ACTION"},413);
  body=JSON.parse(text);
 }catch{return json({error:"INVALID_ACTION"},400)}
 try{
  if(body.action==="prepare"&&allow(body,["action","filename","mime","bytes","title","category"]))
   return json({intent:await prepareOwnerStudioMusic(config,body)},201);
  if(body.action==="complete"&&allow(body,["action","assetId"]))
   return json(await completeOwnerStudioMusic(config,body));
  if(body.action==="preview"&&allow(body,["action","assetId"]))
   return json(await ownerStudioMusicPreview(config,body));
  if(body.action==="publish"&&allow(body,["action","assetId","qualityScore","rightsConfirmed"]))
   return json(await publishOwnerStudioMusic(config,body));
  if(body.action==="retire"&&allow(body,["action","assetId","confirmed"])&&body.confirmed===true)
   return json(await retireOwnerStudioMusic(config,body));
  return json({error:"INVALID_ACTION"},400);
 }catch(error){
  const code=typeof error?.code==="string"?error.code:"MUSIC_STORAGE_UNAVAILABLE";
  const status=Number.isInteger(error?.status)&&error.status>=400&&error.status<=503?error.status:
    code.includes("QUOTA")?413:code.includes("REVIEW")?400:503;
  return json({error:code},status);
 }
}
