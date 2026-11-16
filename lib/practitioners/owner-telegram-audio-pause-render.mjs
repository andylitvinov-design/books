// Private OGG silence insertion with local FFmpeg (zero retains original remux).
import {spawn} from 'node:child_process'
import {mkdtemp,writeFile,readFile,stat,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {joinOggOpus,OWNER_AUDIO_COMBINE_MAX_BYTES,
  OWNER_AUDIO_COMBINE_MAX_PARTS} from './owner-telegram-audio-join.mjs'
import {parseTrackPauseSeconds} from './owner-telegram-track-pause.mjs'

export function ownerAudioPauseArguments(paths,output,pauseSeconds){
  if(!Array.isArray(paths)||paths.length<2||paths.length>OWNER_AUDIO_COMBINE_MAX_PARTS||
     paths.some(path=>typeof path!=='string'||!path)||
     parseTrackPauseSeconds(pauseSeconds)!==pauseSeconds||pauseSeconds===0)
    throw Error('OWNER_AUDIO_COMBINE_PAUSE_INVALID')
  const args=['-hide_banner','-nostdin','-loglevel','error','-y','-threads','2']
  for(const path of paths)args.push('-i',path)
  const filters=paths.map((_,i)=>
    '['+i+':a]aresample=48000,aformat=sample_rates=48000:channel_layouts=mono,'+
    'asetpts=PTS-STARTPTS'+(i<paths.length-1?',apad=pad_dur='+pauseSeconds:'')+'[a'+i+']')
  filters.push(paths.map((_,i)=>'[a'+i+']').join('')+
    'concat=n='+paths.length+':v=0:a=1[out]')
  return [...args,'-filter_complex',filters.join(';'),'-map','[out]',
    '-c:a','libopus','-b:a','48k','-application','voip','-f','ogg',output]
}
async function encode(executable,args){
  if(typeof executable!=='string'||!executable||executable.length>1024)
    throw Error('OWNER_AUDIO_COMBINE_RENDERER_UNAVAILABLE')
  await new Promise((resolve,reject)=>{
    const child=spawn(executable,args,{shell:false,stdio:['ignore','ignore','pipe'],
      env:{PATH:process.env.PATH||'/usr/bin:/bin',HOME:tmpdir(),TMPDIR:tmpdir()}})
    let finished=false,stderrLength=0
    const done=(error)=>{
      if(finished)return
      finished=true;clearTimeout(timeout)
      if(error)reject(error);else resolve()
    }
    const timeout=setTimeout(()=>{
      child.kill('SIGKILL')
      done(Error('OWNER_AUDIO_COMBINE_RENDER_TIMEOUT'))
    },120000)
    child.stderr.on('data',chunk=>{
      stderrLength+=chunk.length
      if(stderrLength>32768)child.kill('SIGKILL')
    })
    child.on('error',()=>done(Error('OWNER_AUDIO_COMBINE_RENDERER_UNAVAILABLE')))
    child.on('close',code=>done(code===0&&stderrLength<=32768
      ?null:Error('OWNER_AUDIO_COMBINE_RENDER_FAILED')))
  })
}
export async function joinOwnerVoiceWithPause(parts,{pauseSeconds=0,executable}={}){
  if(parseTrackPauseSeconds(pauseSeconds)!==pauseSeconds)
    throw Error('OWNER_AUDIO_COMBINE_PAUSE_INVALID')
  // Validate every source/checksum, matching Opus layout and 20MB input cap.
  const lossless=joinOggOpus(parts)
  if(pauseSeconds===0)return lossless
  const dir=await mkdtemp(join(tmpdir(),'hh-owner-pause-'))
  try{
    const paths=[]
    for(let i=0;i<parts.length;i++){
      const path=join(dir,'voice-'+i+'.ogg')
      await writeFile(path,parts[i],{mode:0o600})
      paths.push(path)
    }
    const result=join(dir,'combined.ogg')
    await encode(executable,ownerAudioPauseArguments(paths,result,pauseSeconds))
    const size=(await stat(result)).size
    if(size<128||size>OWNER_AUDIO_COMBINE_MAX_BYTES)
      throw Error('OWNER_AUDIO_COMBINE_RENDER_SIZE')
    const bytes=new Uint8Array(await readFile(result))
    if(Buffer.from(bytes.subarray(0,4)).toString('ascii')!=='OggS')
      throw Error('OWNER_AUDIO_COMBINE_RENDER_FAILED')
    return bytes
  }finally{await rm(dir,{recursive:true,force:true}).catch(()=>{})}
}
