/**
 * Same-origin, one-use audio handoff from the iHelp Messenger to Video Studio.
 * Stored ONLY in the visitor's IndexedDB, never sent to a persistence API.
 * The Studio consumes and deletes the record on its next visit. Expired
 * records are purged on the next access (not a background retention promise).
 */
const DB="hh-voice-studio-handoff-v1",STORE="drafts",KEY="next";
const MAX_BYTES=4*1024*1024,MAX_AGE_MS=15*60*1000;

function openDb(){
  if(typeof indexedDB==="undefined")return Promise.resolve(null);
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB,1);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(Error("LOCAL_VOICE_STORAGE_UNAVAILABLE"));
  });
}
function valid(file,transcript){
  return typeof File!=="undefined"&&file instanceof File&&
    file.size>0&&file.size<=MAX_BYTES&&transcript&&
    typeof transcript.text==="string"&&transcript.text.length<=10000&&
    Number.isFinite(transcript.durationSeconds)&&
    Array.isArray(transcript.segments)&&transcript.segments.length>0&&
    transcript.segments.length<=240&&transcript.segments.every(item=>
      Number.isFinite(item.startSeconds)&&Number.isFinite(item.endSeconds)&&
      item.endSeconds>item.startSeconds&&item.startSeconds>=0&&
      typeof item.text==="string"&&item.text.length<=750);
}
/** Explicitly user-chosen file and verified transcript; at most ONE record. */
export async function stageVoiceStudioHandoff(file,transcript){
  if(!valid(file,transcript))return false;
  let db;
  try{
    db=await openDb();if(!db)return false;
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,"readwrite");
      tx.objectStore(STORE).put({
        version:1,createdAt:Date.now(),file,transcript
      },KEY);
      tx.oncomplete=()=>resolve(true);
      tx.onerror=()=>reject(Error("LOCAL_VOICE_STORAGE_FAILED"));
      tx.onabort=()=>reject(Error("LOCAL_VOICE_STORAGE_ABORTED"));
    });
    return true;
  }catch{return false;}finally{db?.close();}
}
/** Atomic consume/delete; no cross-account server, session or cookie handoff. */
export async function consumeVoiceStudioHandoff(){
  let db;
  try{
    db=await openDb();if(!db)return null;
    const row=await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,"readwrite");
      const get=tx.objectStore(STORE).get(KEY);
      let entry=null;
      get.onsuccess=()=>{entry=get.result;tx.objectStore(STORE).delete(KEY);};
      tx.oncomplete=()=>resolve(entry);
      tx.onerror=()=>reject(Error("LOCAL_VOICE_HANDOFF_FAILED"));
      tx.onabort=()=>reject(Error("LOCAL_VOICE_HANDOFF_ABORTED"));
    });
    if(!row||row.version!==1||!Number.isFinite(row.createdAt)||
      Date.now()-row.createdAt>MAX_AGE_MS||
      Date.now()<row.createdAt||!valid(row.file,row.transcript))return null;
    return {file:row.file,transcript:row.transcript};
  }catch{return null;}finally{db?.close();}
}
