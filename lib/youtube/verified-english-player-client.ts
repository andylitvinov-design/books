/** Resolve a previously verified @aatapro English YouTube upload ID.
 * Never transmit customer data or use a provider credential from the client. */
export async function resolveVerifiedEnglishYouTubeId(
 videoId?:string,signal?:AbortSignal,
):Promise<string|null>{
 if(videoId&&!/^[a-f0-9]{32}$/.test(videoId))return null;
 const url=videoId
  ?"/api/public/english-intro-video?videoId="+encodeURIComponent(videoId)
  :"/api/public/english-intro-video";
 try{
  const response=await fetch(url,{method:"GET",cache:"no-store",credentials:"omit",signal});
  const data=response.ok?await response.json() as {youtubeId?:unknown}:null;
  const id=data?.youtubeId;
  return typeof id==="string"&&/^[A-Za-z0-9_-]{11}$/.test(id)?id:null;
 }catch{return null;}
}
