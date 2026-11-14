/**
 * Bounded first-party cache for the curated Pexels business photographs used
 * as Story fallback. Never a generic URL fetcher or user-supplied proxy.
 * JPEG decoding and geometry are checked again by the browser renderer.
 */
import {STORY_PHOTO_BY_ID,isTrustedStoryPhoto} from "@/lib/mandala/story-photo-library.mjs";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const MAX_BYTES=2_800_000;
const IMAGE_TYPE=/^image\/(?:jpeg|jpg)(?:;|$)/i;
const imageHeaders={
 "Content-Type":"image/jpeg",
 "Cache-Control":"public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
 "X-Content-Type-Options":"nosniff",
 "Cross-Origin-Resource-Policy":"same-origin",
};
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const photo=STORY_PHOTO_BY_ID.get(id);
 if(!photo||!isTrustedStoryPhoto(photo))return new Response(null,{status:404});
 try{
   // The URL is a literal allowlisted source ID; no redirects, cookies, user
   // prompts, profile values or personal information are sent to the CDN.
   const result=await fetch(photo.upstreamSrc,{redirect:"error",cache:"force-cache",
     headers:{Accept:"image/jpeg"},signal:AbortSignal.timeout(8000)});
   if(!result.ok||!IMAGE_TYPE.test(result.headers.get("content-type")||""))
     return new Response(null,{status:503});
   const length=Number(result.headers.get("content-length")||0);
   if(length>MAX_BYTES)return new Response(null,{status:413});
   const bytes=new Uint8Array(await result.arrayBuffer());
   if(bytes.length<1024||bytes.length>MAX_BYTES||bytes[0]!==0xff||bytes[1]!==0xd8)
     return new Response(null,{status:503});
   return new Response(bytes,{status:200,headers:imageHeaders});
 }catch{
   return new Response(null,{status:503});
 }
}
