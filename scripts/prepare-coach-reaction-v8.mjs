// Optional static mirror in the existing production media-preparation step.
import {createHash} from 'node:crypto'
import {mkdir,readFile,writeFile,rename,rm} from 'node:fs/promises'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {COACH_REACTION_V8_MANIFEST} from '../lib/coaching/coach-reaction-v8-manifest.mjs'
const ASSETS=Object.freeze({'MIR-02':'b4a09ab4c90541b4a0e0b9725858728f','MER-01':'097449b39a064e85a1179316b5074fdf','MER-N02':'756ff3f5ee1a4165aaffbdf06f6ec2a3'})
export function validV8Bytes(bytes,item){
 return Boolean(Buffer.isBuffer(bytes)&&bytes.length===item.size&&bytes.toString('ascii',4,8)==='ftyp'&&createHash('sha256').update(bytes).digest('hex')===item.sha256)
}
export async function stageCoachV8({directory,manifestPath,production=false,fetchImpl=fetch,log=console}){
 await mkdir(directory,{recursive:true})
 const stage=async item=>{
  const file=join(directory,item.file),temp=file+'.staging'
  try{
   try{if(validV8Bytes(await readFile(file),item))return item.id}catch{}
   if(!production)return null
   const assetId=ASSETS[item.id]
   if(!/^[a-f0-9]{32}$/.test(assetId||''))return null
   const response=await fetchImpl('https://resource2.heygen.ai/video/'+assetId+'/original.mp4',{
    redirect:'error',signal:AbortSignal.timeout(20000),headers:{Accept:'video/mp4'}})
   if(!response.ok)throw Error('HTTP '+response.status)
   const type=response.headers.get('content-type')||''
   if(!/^(video\/mp4|application\/octet-stream)(?:;|$)/i.test(type))throw Error('MIME')
   const declared=response.headers.get('content-length')
   if(declared!==null&&Number(declared)!==item.size)throw Error('size header')
   let count=0;const chunks=[]
   for await(const part of response.body){count+=part.byteLength;if(count>item.size)throw Error('size budget');chunks.push(Buffer.from(part))}
   const bytes=Buffer.concat(chunks)
   if(!validV8Bytes(bytes,item))throw Error('digest mismatch')
   await writeFile(temp,bytes);await rename(temp,file)
   return item.id
  }catch(error){log.warn('HH_COACH_V8_HOLD '+item.id+' '+String(error.message).slice(0,120));return null}
  finally{await rm(temp,{force:true}).catch(()=>{})}
 }
 const verified=new Set((await Promise.all(COACH_REACTION_V8_MANIFEST.map(stage))).filter(Boolean))
 if(!verified.has('MER-01')||!verified.has('MER-N02')){verified.delete('MER-01');verified.delete('MER-N02')}
 const flags=Object.fromEntries(COACH_REACTION_V8_MANIFEST.filter(item=>verified.has(item.id)).map(item=>[item.id,item.sha256]))
 const source='// Generated after exact MP4 SHA-256/size checks; no runtime provider URLs.\nexport const COACH_REACTION_V8_STAGED=Object.freeze('+JSON.stringify(flags)+')\n'
 await writeFile(manifestPath+'.staging',source);await rename(manifestPath+'.staging',manifestPath)
 log.log('HH_COACH_V8_STAGED '+verified.size+'/3 '+[...verified].join(','))
 return flags
}
export async function prepareCoachV8(){
 const root=fileURLToPath(new URL('../',import.meta.url))
 return stageCoachV8({directory:join(root,'public/images/holistic-house/my-coach-motion/reaction-v8'),
 manifestPath:join(root,'lib/coaching/coach-reaction-v8-staged.mjs'),
 production:process.env.VERCEL_ENV==='production'||process.env.HH_COACH_NATURAL_BUILD==='1'})
}
