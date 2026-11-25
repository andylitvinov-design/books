/** Short-lived signed private music links, scoped to one mounted editor. No MP3 bytes. */
export function createStudioMusicPreviewUrlCache(sign,{now=Date.now,minValidityMs=15_000,capacity=12}={}){
 if(typeof sign!=="function")throw TypeError("SIGNER_REQUIRED");
 const ready=new Map(),inflight=new Map();let epoch=0;
 const peek=id=>{
  const value=ready.get(id);
  if(!value)return null;
  if(!Number.isFinite(value.expiresAt)||value.expiresAt<=now()+minValidityMs){
   ready.delete(id);return null;
  }
  return value.url;
 };
 const get=row=>{
  const id=row?.id;
  if(typeof id!=="string"||!id)return Promise.reject(Error("INVALID_MUSIC_ID"));
  const cached=peek(id);
  if(cached)return Promise.resolve(cached);
  if(inflight.has(id))return inflight.get(id);
  const generation=epoch;
  const promise=Promise.resolve().then(()=>sign(row)).then(value=>{
   if(typeof value?.url!=="string"||!Number.isFinite(value.expiresAt)||
     value.expiresAt<=now())throw Error("MUSIC_LINK_EXPIRED");
   if(generation===epoch&&value.expiresAt>now()+minValidityMs){
    ready.delete(id);ready.set(id,value);
    while(ready.size>capacity)ready.delete(ready.keys().next().value);
   }
   return value.url;
  }).finally(()=>{if(inflight.get(id)===promise)inflight.delete(id)});
  inflight.set(id,promise);
  return promise;
 };
 const prime=(rows,limit=3)=>{
  if(!Array.isArray(rows))return;
  for(const row of rows.slice(0,Math.min(3,Math.max(0,limit)))){
   if(typeof row?.id==="string"&&!peek(row.id))
    void get(row).catch(()=>{/* Warmup is never audible playback. */});
  }
 };
 const clear=()=>{epoch++;ready.clear();inflight.clear()};
 return {peek,get,prime,clear};
}
