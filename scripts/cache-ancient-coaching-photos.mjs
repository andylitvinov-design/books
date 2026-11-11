// Build-time only: self-host historically photographed, credited objects.
// Direct Wikimedia hotlinks do not reliably load on iPhone Safari. Cache
// approved Commons thumbnails in Next.js public assets before the build.
// Never download personal or client media here.
import { readFile, mkdir, writeFile, rename, rm } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { traditionStages, traditionStageImage } from '../lib/personal-coaching/tradition-visuals.js'
import { traditionCoachingArt } from '../lib/coaching/public-session-art.js'

const outputRoot = resolve(fileURLToPath(new URL('../public/',import.meta.url)))
const prefix='/images/holistic-house/coaching-ancient/'
const manifest=[
 { file:'Egypt_bookofthedead.jpg',path:traditionCoachingArt.egyptian,width:640 },
 { file:'Marble statue of Athena, Louvre.jpg',path:traditionCoachingArt.greek,width:640 },
 ...['egyptian','greek'].flatMap(slug=>traditionStages(slug).map(stage=>({
  file:stage.photo.file,path:traditionStageImage(stage),width:480
 }))),
]
if(manifest.length!==18||new Set(manifest.map(item=>item.path)).size!==18)
 throw new Error('Expected 18 unique Egyptian/Greek coaching photographs')
function destination(item){
 if(!item.path.startsWith(prefix)||!/^[a-z-]+\.(?:jpg|png)$/.test(item.path.slice(prefix.length)))
  throw new Error('Unknown historical photo output path: '+item.path)
 const result=resolve(outputRoot,'.'+item.path)
 if(!result.startsWith(outputRoot+sep))throw new Error('Unsafe media output path')
 return result
}
function validPhoto(bytes,target){
 if(!bytes||bytes.length<500||bytes.length>1_500_000)return false
 if(target.endsWith('.png'))
  return bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&
   bytes[3]===0x47&&bytes[4]===0x0d&&bytes[5]===0x0a
 return bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff
}
async function mirror(item){
 const target=destination(item)
 try{
  const existing=await readFile(target)
  if(validPhoto(existing,target))return existing.length
 }catch{}
 const url='https://commons.wikimedia.org/wiki/Special:FilePath/' +
  encodeURIComponent(item.file).replaceAll('%20','_')+'?width='+item.width
 let lastError
 for(let attempt=1;attempt<=3;attempt++){
  const temp=target+'.part-'+process.pid
  try{
   const response=await fetch(url,{
    redirect:'follow',
    headers:{
     'Accept':'image/jpeg,image/png',
     'User-Agent':'HolisticHouseHistoricalCourseMedia/1.0 (https://holistichouse.vercel.app)'
    },
    signal:AbortSignal.timeout(16000)
   })
   if(!response.ok)throw new Error('Commons HTTP '+response.status)
   const mime=response.headers.get('content-type')||''
   if(!/^image\/(?:jpeg|png)(?:;|$)/i.test(mime))
    throw new Error('Non-photo response: '+mime)
   const data=Buffer.from(await response.arrayBuffer())
   if(!validPhoto(data,target))throw new Error('Invalid/oversized photo')
   await mkdir(dirname(target),{recursive:true})
   await writeFile(temp,data)
   await rename(temp,target)
   return data.length
  }catch(error){
   lastError=error
   await rm(temp,{force:true})
   if(attempt<3)await new Promise(done=>setTimeout(done,300*attempt))
  }
 }
 throw new Error('Could not mirror '+item.file+': '+lastError?.message)
}
// Bounded concurrency prevents requests swamping Commons or the build runner.
let total=0
for(let i=0;i<manifest.length;i+=3){
 const sizes=await Promise.all(manifest.slice(i,i+3).map(mirror))
 total+=sizes.reduce((sum,size)=>sum+size,0)
}
console.log('Historical coaching photos: 18/18 first-party files verified ('+total+' bytes)')
