/**
 * Browser-only, best-effort cache for public fixed Gemini voice demonstrations.
 * Never store client/approved narration or health information here.
 * Cache is private to this browser and has no server, billing or tracking dependency.
 */
import {validatedPublicVoiceSampleDuration} from "./public-voice-sample-integrity.mjs";
const DATABASE = "hh-public-voice-demos-v1";
const STORE = "fixed-samples";
const EXPIRES_MS = 14 * 86400_000;
const MAX_SAMPLE_BYTES = 2 * 1024 * 1024;
const OPEN_TIMEOUT_MS = 900;

type SampleRecord = {key:string; audio:Blob; storedAt:number};

export function publicVoiceSampleKey(
  language:string, voiceId:string, providerVoice:string, model:string, fixedText:string,
):string {
  // All arguments are public, application-owned constants. No user text.
  return ["gemini-v1",language,voiceId,providerVoice,model,fixedText].join("|");
}

export function isFreshPublicVoiceSample(
  record:unknown, key:string, now=Date.now(),
):record is SampleRecord {
  if(!record || typeof record!=="object")return false;
  const entry=record as Partial<SampleRecord>;
  return entry.key===key && entry.audio instanceof Blob &&
    entry.audio.size>=44 && entry.audio.size<=MAX_SAMPLE_BYTES &&
    /^(?:audio\/wav|audio\/x-wav)(?:;|$)/i.test(entry.audio.type) &&
    typeof entry.storedAt==="number" && Number.isFinite(entry.storedAt) &&
    entry.storedAt<=now && now-entry.storedAt<EXPIRES_MS;
}

async function openPublicSamples():Promise<IDBDatabase|null>{
  if(typeof indexedDB==="undefined")return null;
  return new Promise(resolve=>{
    let settled=false;
    let timeout:ReturnType<typeof setTimeout>|undefined;
    const finish=(database:IDBDatabase|null)=>{
      if(settled){database?.close();return;}
      settled=true;
      if(timeout!==undefined)clearTimeout(timeout);
      resolve(database);
    };
    try {
      const request=indexedDB.open(DATABASE,1);
      timeout=setTimeout(()=>finish(null),OPEN_TIMEOUT_MS);
      request.onupgradeneeded=()=>{
        if(!request.result.objectStoreNames.contains(STORE))
          request.result.createObjectStore(STORE,{keyPath:"key"});
      };
      request.onsuccess=()=>finish(request.result);
      request.onerror=()=>finish(null);
      request.onblocked=()=>finish(null);
    }catch{finish(null);}
  });
}

export async function loadPublicVoiceSample(key:string):Promise<Blob|null>{
  const db=await openPublicSamples();
  if(!db)return null;
  let audio:Blob|null=null;
  try{
    audio=await new Promise<Blob|null>(resolve=>{
      try{
        const request=db.transaction(STORE,"readonly").objectStore(STORE).get(key);
        request.onsuccess=()=>resolve(isFreshPublicVoiceSample(request.result,key)
          ? request.result.audio : null);
        request.onerror=()=>resolve(null);
      }catch{resolve(null);}
    });
  }finally{db.close();}
  if(!audio)return null;
  try{
    if(validatedPublicVoiceSampleDuration(await audio.arrayBuffer())!==null)return audio;
  }catch{/* Corrupt cached WAV. */}
  await deletePublicVoiceSample(key);
  return null;
}

export async function storePublicVoiceSample(key:string,audio:Blob):Promise<void>{
  // Caller must ensure the provider was Gemini and WAV header/duration verified.
  if(!(audio instanceof Blob) || audio.size<44 || audio.size>MAX_SAMPLE_BYTES ||
    !/^(?:audio\/wav|audio\/x-wav)(?:;|$)/i.test(audio.type))return;
  try{
    if(validatedPublicVoiceSampleDuration(await audio.arrayBuffer())===null)return;
  }catch{return;}
  const db=await openPublicSamples();
  if(!db)return; // Safari private mode / quota denial must not break playback.
  try{
    await new Promise<void>(resolve=>{
      try{
        const transaction=db.transaction(STORE,"readwrite");
        const object=transaction.objectStore(STORE);
        const now=Date.now();
        object.put({key,audio,storedAt:now} satisfies SampleRecord);
        // Prune expired public audio; no user data is read or stored.
        const cursor=object.openCursor();
        cursor.onsuccess=()=>{
          const item=cursor.result;
          if(!item)return;
          if(!isFreshPublicVoiceSample(item.value,item.key as string,now))item.delete();
          item.continue();
        };
        transaction.oncomplete=()=>resolve();
        transaction.onerror=()=>resolve();
        transaction.onabort=()=>resolve();
      }catch{resolve();}
    });
  }finally{db.close();}
}

/** Evict this single public fixed voice; never clear user or other voice data. */
export async function deletePublicVoiceSample(key:string):Promise<void>{
  const db=await openPublicSamples();
  if(!db)return;
  try{
    await new Promise<void>(resolve=>{
      try{
        const tx=db.transaction(STORE,"readwrite");
        tx.objectStore(STORE).delete(key);
        tx.oncomplete=()=>resolve();
        tx.onerror=()=>resolve();
        tx.onabort=()=>resolve();
      }catch{resolve();}
    });
  }finally{db.close();}
}
