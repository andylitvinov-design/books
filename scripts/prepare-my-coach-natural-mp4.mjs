// HeyGen completed 8/8. Manifest GUIDs identify MP4 OUTPUT files, not video record IDs.\n// Build-only, no new runtime provider: eight owner-generated natural MP4 takes
// are mirrored once into the existing Next.js public folder by the hourly
// Production build, compressed with the already installed pinned ffmpeg-static.
import {createRequire} from 'node:module'
import {spawnSync} from 'node:child_process'
import {access,mkdir,readFile,writeFile,rename,rm} from 'node:fs/promises'
import {constants} from 'node:fs'
import {dirname,join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {coachNaturalFilename} from '../lib/coaching/coach-natural-motion.mjs'

const production=process.env.VERCEL_ENV==='production'||
  process.env.HH_COACH_NATURAL_BUILD==='1'
if(!production){
  console.log('HH_COACH_NATURAL_MP4_SKIP_NON_PROD')
}else{
  const account='29b72be65e0e493f9570e7a40a904b91'
  const prefix='https://resource2.heygen.ai/videos/'+account+'/'+account+'/'
  const takes=Object.freeze({
    'mira-calm':'01a1f053-beba-7cf7-affc-20003b7f4307',
    'mira-attentive':'01a1f059-4592-7169-807a-0b22b9fb501a',
    'sofia-calm':'01a1f054-e361-77ab-8ce7-d20549f511ec',
    'sofia-attentive':'01a1f059-5078-7981-a59e-1e2300c8d5b2',
    'max-calm':'01a1f054-eab5-7b2f-a1a1-09348ec169bb',
    'max-attentive':'01a1f059-58ce-748e-8c5b-e77b72c73a42',
    'alex-calm':'01a1f054-f243-75a4-af27-65a6c57c5e99',
    'alex-attentive':'01a1f059-603b-73c0-9650-8fc3e7d94a9b'
  })
  const names=Object.keys(takes)
  if(names.length!==8||new Set(Object.values(takes)).size!==8||
     names.some(name=>!/^(mira|sofia|max|alex)-(calm|attentive)$/.test(name)))
     throw Error('Invalid fixed natural coach media manifest')
  const require=createRequire(import.meta.url)
  const binary=join(dirname(require.resolve('ffmpeg-static')),
    process.platform==='win32'?'ffmpeg.exe':'ffmpeg')
  await access(binary,constants.X_OK)
  const root=resolve(fileURLToPath(new URL('../public/images/holistic-house/my-coach-motion/',import.meta.url)))
  await mkdir(root,{recursive:true})
  function valid(bytes){
    return bytes?.subarray(4,8).toString('ascii')==='ftyp'&&
      bytes.length>9000&&bytes.length<900000&&
      bytes.includes(Buffer.from('moov'))&&
      bytes.includes(Buffer.from('avc1'))&&!bytes.includes(Buffer.from('soun'))
  }
  async function prepare(name,id){
    const [persona,take]=name.split('-')
    const filename=coachNaturalFilename(persona,take)
    if(!filename)throw Error('Invalid natural coach output filename')
    const file=resolve(root,filename)
    const input=file+'.source.mp4',out=file+'.new.mp4'
    try{
      try{if(valid(await readFile(file)))return {name,bytes:0,ok:true}}catch{}
      const url=new URL(prefix+id+'.mp4')
      if(url.protocol!=='https:'||url.hostname!=='resource2.heygen.ai')
        throw Error('Media host allowlist failed')
      const res=await fetch(url,{redirect:'error',
        headers:{Accept:'video/mp4', 'User-Agent':'HolisticHouseFirstPartyCoachMotion/1.0'},
        signal:AbortSignal.timeout(25000)})
      if(!res.ok)throw Error('Origin HTTP '+res.status)
      const mime=res.headers.get('content-type')||''
      if(mime&&!/(?:video\/mp4|application\/octet-stream)/i.test(mime))
        throw Error('Unexpected media MIME')
      if(Number(res.headers.get('content-length')||0)>12000000)
        throw Error('Media source too large')
      const chunks=[];let n=0
      for await(const item of res.body){
        n+=item.byteLength
        if(n>12000000)throw Error('Source byte budget exceeded')
        chunks.push(Buffer.from(item))
      }
      const bytes=Buffer.concat(chunks)
      if(bytes.subarray(4,8).toString('ascii')!=='ftyp')
        throw Error('Origin did not return MP4')
      await writeFile(input,bytes)
      const flags=['-hide_banner','-loglevel','error','-y','-i',input,
        '-t','5','-vf','fps=24,scale=328:456:force_original_aspect_ratio=increase,crop=328:456',
        '-an','-c:v','libx264','-preset','veryfast','-crf','31',
        '-pix_fmt','yuv420p','-profile:v','baseline','-level','3.0',
        '-movflags','+faststart',out]
      const job=spawnSync(binary,flags,{encoding:'utf8',timeout:45000,maxBuffer:131072})
      if(job.error||job.status!==0)
        throw Error('FFmpeg failed: '+String(job.stderr||job.error?.message).slice(0,100))
      const result=await readFile(out)
      if(!valid(result))throw Error('Output failed H264/audio/size validation')
      await rename(out,file)
      return {name,bytes:result.length,ok:true}
    }catch(e){
      console.warn('HH_COACH_NATURAL_MP4_STATIC_FALLBACK '+name+' '+e.message)
      return {name,bytes:0,ok:false}
    }finally{
      await rm(input,{force:true}).catch(()=>{})
      await rm(out,{force:true}).catch(()=>{})
    }
  }
  // Two parallel transfers, no per-visitor video generation, no retry loop.
  const status=[]
  for(let index=0;index<names.length;index+=2)
    status.push(...await Promise.all(names.slice(index,index+2).map(name=>prepare(name,takes[name]))))
  console.log('HH_COACH_NATURAL_MP4 '+status.filter(x=>x.ok).length+'/8 first-party clips, '+
    status.reduce((sum,item)=>sum+item.bytes,0)+' new bytes')
}

// Reuse this existing guarded prebuild invocation; no new Vercel jobs.
await import('./prepare-samir-motion-mp4.mjs')
