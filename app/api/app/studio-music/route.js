import {getAppConfig,requireSameOrigin} from "@/lib/app/config";
import {listPublishedStudioMusic,signedPublishedStudioMusic}
 from "@/lib/mandala/studio-music-library-server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const h={"Cache-Control":"no-store, max-age=0","X-Content-Type-Options":"nosniff"};
const json=(value,status=200)=>Response.json(value,{status,headers:h});
export async function GET(){
 try{return json(await listPublishedStudioMusic(getAppConfig()))}
 catch{return json({items:[],unavailable:true},503)}
}
export async function POST(request){
 try{
  const config=getAppConfig();requireSameOrigin(request,config);
  if(!request.headers.get("content-type")?.startsWith("application/json"))
   return json({error:"INVALID_ACTION"},415);
  const raw=await request.text();
  if(raw.length>320)return json({error:"INVALID_ACTION"},413);
  const body=JSON.parse(raw);
  if(!body||body.action!=="open"||typeof body.assetId!=="string"||
   Object.keys(body).some(k=>!["action","assetId"].includes(k)))
   return json({error:"INVALID_ACTION"},400);
  return json(await signedPublishedStudioMusic(config,body));
 }catch{return json({error:"MUSIC_UNAVAILABLE"},404)}
}
