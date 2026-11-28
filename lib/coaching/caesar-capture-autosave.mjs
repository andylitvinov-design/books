import {archiveBlob,ARCHIVE_API} from './caesar-capture-archive.mjs'
const DB='hh-caesar-editorial-capture-v1',KEY='ru'
function local(action,blob){
 return new Promise((resolve,reject)=>{
  if(!globalThis.indexedDB){reject(Error('LOCAL_ARCHIVE_UNAVAILABLE'));return}
  const req=indexedDB.open(DB,1)
  req.onupgradeneeded=()=>req.result.createObjectStore('capture')
  req.onerror=()=>reject(req.error)
  req.onsuccess=()=>{const db=req.result;let tx;try{tx=db.transaction('capture',action==='get'?'readonly':'readwrite');const store=tx.objectStore('capture');const op=action==='put'?store.put(blob,KEY):action==='delete'?store.delete(KEY):store.get(KEY);tx.oncomplete=()=>{const value=op.result;db.close();resolve(value)};tx.onabort=()=>{db.close();reject(tx.error)};tx.onerror=()=>{db.close();reject(tx.error)}}catch(e){db.close();reject(e)}}
 })
}
export const retainCapture=blob=>local('put',blob)
export const recoverCapture=()=>local('get')
export const clearCapture=()=>local('delete')
export async function archiveStatus(){
 const r=await fetch(ARCHIVE_API,{cache:'no-store',signal:AbortSignal.timeout(15000)})
 if(!r.ok)throw Error('ARCHIVE_UNAVAILABLE')
 const data=await r.json();if(data.ready!==true)throw Error('ARCHIVE_UNAVAILABLE');return data
}
export async function saveCapture(blob){
 return archiveBlob(blob,{
  digest:async file=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),n=>n.toString(16).padStart(2,'0')).join(''),
  request:async body=>{const r=await fetch(ARCHIVE_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error('ARCHIVE_UNCONFIRMED');return r.json()},
  upload:async(intent,file)=>{const {createClient}=await import('@supabase/supabase-js');const client=createClient(intent.supabaseUrl,intent.publishableKey,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(120000)})}});const {error}=await client.storage.from(intent.bucket).uploadToSignedUrl(intent.path,intent.token,file,{contentType:'video/mp4',upsert:false});if(error)throw Error('ARCHIVE_UPLOAD_FAILED')}
 })
}
