// Encode the existing, validated Gemini recording once. This module accepts
// server-generated PCM WAV only; no uploaded files, URLs or shell commands.
import {spawn} from 'node:child_process'
import {mkdtemp,readFile,rm,stat,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {validCoachWav} from './gemini-coach-tts.mjs'
import {isMp3Bytes} from './coach-greeting-mp3-store.mjs'
import {resolveOwnerVideoFfmpegPath} from '../practitioners/owner-telegram-video-render.mjs'

export async function encodeCoachGreetingMp3(wav,{signal}={}){
  if(!validCoachWav(wav))throw Error('COACH_GREETING_INVALID_WAV')
  signal?.throwIfAborted()
  const {default:packagePath}=await import('ffmpeg-static')
  const executable=await resolveOwnerVideoFfmpegPath(packagePath)
  const directory=await mkdtemp(join(tmpdir(),'hh-coach-greeting-'))
  try{
    const input=join(directory,'greeting.wav'),output=join(directory,'greeting.mp3')
    await writeFile(input,wav,{mode:0o600})
    await new Promise((resolve,reject)=>{
      const child=spawn(executable,[
        '-hide_banner','-nostdin','-loglevel','error','-y','-threads','1',
        '-protocol_whitelist','file','-f','wav','-i',input,
        '-map','0:a:0','-vn','-sn','-dn','-map_metadata','-1',
        '-c:a','libmp3lame','-b:a','96k','-ar','24000','-ac','1',output,
      ],{shell:false,env:{},stdio:'ignore',timeout:8000,killSignal:'SIGKILL',signal})
      child.once('error',()=>reject(Error('COACH_GREETING_MP3_ENCODING_FAILED')))
      child.once('close',code=>code===0?resolve():reject(Error('COACH_GREETING_MP3_ENCODING_FAILED')))
    })
    // PCM is limited to 50 seconds. A 96kbps recording fits comfortably below 1MiB.
    const file=await stat(output)
    if(!file.isFile()||file.size>1024*1024)throw Error('COACH_GREETING_INVALID_MP3')
    const audio=await readFile(output)
    if(!isMp3Bytes(audio))throw Error('COACH_GREETING_INVALID_MP3')
    return audio
  }finally{
    await rm(directory,{recursive:true,force:true})
  }
}
