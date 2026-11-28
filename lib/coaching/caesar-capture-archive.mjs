// One private editorial candidate. Never public, never a customer recording.
export const ARCHIVE_BUCKET='hh-owner-video-drafts'
export const ARCHIVE_PATH='caesar-editorial/greeting-ru-v1.mp4'
export const ARCHIVE_MAX_BYTES=40000000
export const ARCHIVE_API='/api/admin/caesar-capture-archive'
export function archiveInput(body){
 if(!body||!['prepare','complete'].includes(body.action)||Object.keys(body).length!==3||!Number.isSafeInteger(body.bytes)||body.bytes<1024||body.bytes>ARCHIVE_MAX_BYTES||!/^[a-f0-9]{64}$/.test(body.sha256||''))throw Error('ARCHIVE_INVALID')
 return {action:body.action,bytes:body.bytes,sha256:body.sha256}
}
export function archiveMetadata(item){
 if(!item)return null
 const bytes=Number(item.metadata?.size??item.size),mime=String(item.metadata?.mimetype??item.contentType??'').split(';')[0]
 if(!Number.isSafeInteger(bytes)||bytes<1024||bytes>ARCHIVE_MAX_BYTES||mime!=='video/mp4')throw Error('ARCHIVE_INVALID')
 return {bytes,mime}
}
export function isArchiveMp4(header){return header instanceof Uint8Array&&header.length>=12&&String.fromCharCode(...header.slice(4,8))==='ftyp'}
export async function archiveBlob(blob,{request,upload,digest}){
 if(!blob||!Number.isSafeInteger(blob.size)||blob.size<1024||blob.size>ARCHIVE_MAX_BYTES||!isArchiveMp4(new Uint8Array(await blob.slice(0,12).arrayBuffer())))throw Error('ARCHIVE_INVALID')
 const sha256=await digest(blob),input={bytes:blob.size,sha256}
 // If a prior response was lost, verify the same bytes before minting another upload URL.
 const intent=await request({action:'prepare',...input})
 if(intent?.saved===true){if(intent.sha256!==sha256||intent.bytes!==blob.size)throw Error('ARCHIVE_CONFLICT');return intent}
 if(intent?.bucket!==ARCHIVE_BUCKET||intent.path!==ARCHIVE_PATH||!intent.token||!intent.publishableKey||!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(intent.supabaseUrl||''))throw Error('ARCHIVE_INVALID')
 try{await upload(intent,blob)}catch{/* A completed PUT can lose its response; verify the fixed object before reporting failure. */}
 const result=await request({action:'complete',...input})
 if(result?.saved!==true||result.sha256!==sha256||result.bytes!==blob.size)throw Error('ARCHIVE_UNCONFIRMED')
 return result
}
