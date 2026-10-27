// Offline and read-only scene-boundary analysis for OPTIONAL Openverse SFX proposals.
// This script never calls Openverse, downloads audio, mixes, publishes, or overwrites video.
import {spawn} from 'node:child_process'
import {lstat, writeFile, readFile} from 'node:fs/promises'
import {basename, dirname, extname, isAbsolute, join, resolve} from 'node:path'
import {pathToFileURL} from 'node:url'

const MAX_BYTES=250_000_000
const MAX_SECONDS=120
const MAX_LOG_BYTES=1_000_000
const MAX_CUES=6

function invalid(reason){throw Error('SFX_PROPOSAL_'+reason)}
function round(value){return Math.round(value*1000)/1000}

export function parseSceneScan(output){
 const match=String(output).match(/Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d+)/)
 if(!match)invalid('DURATION_UNKNOWN')
 const seconds=Number(match[1])*3600+Number(match[2])*60+Number(match[3])+Number('0.'+match[4])
 if(!(seconds>=2&&seconds<=MAX_SECONDS))invalid('DURATION_LIMIT')
 const cuts=[]
 for(const line of String(output).split('\n')){
   if(!/Parsed_showinfo/.test(line))continue
   const pts=line.match(/\bpts_time:\s*([0-9]+(?:\.[0-9]+)?)/)
   if(!pts)continue
   const time=Number(pts[1])
   if(Number.isFinite(time))cuts.push(time)
 }
 return {duration:round(seconds),cuts}
}

// A conservative hard-cut heuristic: no inferred clicks/ambient noise or speech processing.
export function suggestSceneSfx(source, scanned){
 if(!source||typeof source!=='string'||basename(source)!==source||extname(source).toLowerCase()!=='.mp4')invalid('SOURCE_NAME')
 if(!scanned||typeof scanned!=='object'||!Number.isFinite(scanned.duration)||scanned.duration<2||scanned.duration>MAX_SECONDS||!Array.isArray(scanned.cuts))invalid('SCAN_INVALID')
 const kept=[]
 for(const time of scanned.cuts.sort((a,b)=>a-b)){
   if(!Number.isFinite(time)||time<0||time>scanned.duration)invalid('CUT_INVALID')
   if(time<0.9||time>scanned.duration-0.7||kept.length&&time-kept.at(-1)<2.0)continue
   kept.push(round(time))
   if(kept.length===MAX_CUES)break
 }
 const cues=kept.map(time=>({type:'soft-transition',query:'soft whoosh transition',atSeconds:round(Math.max(0,time-0.12)),durationSeconds:0.55,gain:0.08}))
 const stem=source.slice(0,-4)
 return {
   version:1,source,decision:cues.length?'review_required':'no_scene_sfx_needed',
   analysis:'local_scene_cut_heuristic',durationSeconds:scanned.duration,
   detectedCuts:scanned.cuts.length,proposedCuts:kept,
   status:'draft_only_not_approved',privacy:'local_only',
   reason:cues.length?'Review each proposed transition against footage and speech before downloading any audio.':'No montage transitions detected; do not invent effects in a continuous talking-head video.',
   plan:cues.length?{video:source,output:stem+'-sfx-preview.mp4',cues}:null
 }
}

async function scanFile(path,executable){
 if(typeof executable!=='string'||!executable||executable.length>1024)invalid('FFMPEG_UNAVAILABLE')
 const args=['-hide_banner','-nostdin','-loglevel','info','-threads','2',
   '-i',path,'-an','-vf','select=gt(scene\\,0.30),showinfo',
   '-fps_mode','vfr','-f','null','-']
 const output=await new Promise((resolveOutput,reject)=>{
   const proc=spawn(executable,args,{shell:false,stdio:['ignore','ignore','pipe']})
   let done=false, bytes=0, chunks=[]
   function end(error,result){if(done)return;done=true;clearTimeout(timer);error?reject(error):resolveOutput(result)}
   const timer=setTimeout(()=>{proc.kill('SIGKILL');end(Error('SFX_PROPOSAL_TIMEOUT'))},90000)
   proc.stderr.on('data',chunk=>{bytes+=chunk.length;if(bytes>MAX_LOG_BYTES)proc.kill('SIGKILL');else chunks.push(chunk)})
   proc.on('error',()=>end(Error('SFX_PROPOSAL_FFMPEG_UNAVAILABLE')))
   proc.on('close',code=>code===0&&bytes<=MAX_LOG_BYTES?end(null,Buffer.concat(chunks).toString('utf8')):end(Error('SFX_PROPOSAL_SCAN_FAILED')))
 })
 return parseSceneScan(output)
}

export async function proposeForVideo(video,{executable}={}){
 if(typeof video!=='string'||!isAbsolute(video)||extname(video).toLowerCase()!=='.mp4')invalid('INPUT_PATH')
 const path=resolve(video)
 const info=await lstat(path)
 if(!info.isFile()||info.isSymbolicLink()||info.size<1024||info.size>MAX_BYTES)invalid('INPUT_SIZE')
 const scan=await scanFile(path,executable)
 return suggestSceneSfx(basename(path),scan)
}

export async function proposeMain(argv,{executable}={}){
 if(argv.length!==1)invalid('USAGE_VIDEO_PATH')
 const video=resolve(argv[0])
 const result=await proposeForVideo(video,{executable})
 const destination=join(dirname(video),basename(video,'.mp4')+'-sfx-proposal.json')
 const previous=await readFile(destination,'utf8').catch(error=>error.code==='ENOENT'?null:Promise.reject(error))
 if(previous!==null)invalid('PROPOSAL_ALREADY_EXISTS')
 await writeFile(destination,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600})
 return {decision:result.decision,path:destination,proposed:result.proposedCuts.length}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const {default:ffmpeg}=await import('ffmpeg-static')
 proposeMain(process.argv.slice(2),{executable:ffmpeg}).then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1})
}
