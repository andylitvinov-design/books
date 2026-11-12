// Build-time guard: npm's install-script approval policy can skip ffmpeg-static's
// native download while still reporting a successful Next.js deployment.
// Run before Next builds; never download or execute dependency installers in
// a Telegram webhook or any user-facing request.
import {spawnSync} from 'node:child_process'
import {accessSync,chmodSync,constants,copyFileSync,readFileSync,statSync,unlinkSync} from 'node:fs'
import {createRequire} from 'node:module'
import {dirname,join,resolve} from 'node:path'

const require=createRequire(import.meta.url)
const BINARY=process.platform==='win32'?'ffmpeg.exe':'ffmpeg'

function binaryPath(){
 try{return join(dirname(require.resolve('ffmpeg-static')),BINARY)}
 catch{return null}
}
function isUsableFfmpeg(executable,minBytes=100_000){
 if(!executable)return false
 try{
  const file=statSync(executable)
  if(!file.isFile()||file.size<minBytes)return false
  accessSync(executable,constants.X_OK)
  const probe=spawnSync(executable,['-hide_banner','-version'],{
   encoding:'utf8',timeout:10000,maxBuffer:256*1024
  })
  return !probe.error&&probe.status===0&&probe.stdout.startsWith('ffmpeg version')
 }catch{return false}
}
function binaryIsReady(){
 return isUsableFfmpeg(binaryPath())
}
function materializeVerifiedMacFfmpeg(){
 // Only the explicit macOS CI build step sets this variable. Production builds
 // keep the pinned ffmpeg-static download/rebuild path and never use a host binary.
 const external=process.env.HH_FFMPEG_EXTERNAL_PATH
 if(process.platform!=='darwin'||!external)return false
 const source=resolve(external),target=binaryPath()
 if(!target||!isUsableFfmpeg(source))return false
 try{
  try{unlinkSync(target)}catch(error){if(error?.code!=='ENOENT')throw error}
  copyFileSync(source,target)
  chmodSync(target,0o755)
  if(!binaryIsReady())throw new Error('package-local FFmpeg verification failed')
  console.log('HH_OWNER_VIDEO_FFMPEG_EXTERNAL_MATERIALIZED')
  return true
 }catch(error){
  console.error('HH_OWNER_VIDEO_FFMPEG_EXTERNAL_REJECTED:',error?.message||error)
  return false
 }
}
if(!binaryIsReady()&&!materializeVerifiedMacFfmpeg()){
 console.warn('HH_OWNER_VIDEO_FFMPEG_MISSING_AT_BUILD: rebuilding pinned ffmpeg-static')
 const result=spawnSync('npm',['rebuild','ffmpeg-static','--no-audit','--no-fund'],{
   stdio:'inherit',timeout:120000,env:process.env
 })
 if(result.error||result.status!==0||!binaryIsReady()){
   console.error('HH_OWNER_VIDEO_FFMPEG_BUILD_FAILED')
   process.exit(1)
 }
}
console.log('HH_OWNER_VIDEO_FFMPEG_BUILD_READY')

if(process.argv.includes('--verify-trace')){
 // The Next build must ship the executable with Dot's signed webhook.
 // An ordinary 200/build without this check previously shipped a broken bot.
 const traceFile=join(process.cwd(),
   '.next/server/app/api/app/notification-channels/telegram/webhook/route.js.nft.json')
 let paths=[]
 try{paths=JSON.parse(readFileSync(traceFile,'utf8')).files||[]}
 catch{console.error('HH_OWNER_VIDEO_FFMPEG_TRACE_MISSING');process.exit(1)}
 if(!paths.some(file=>typeof file==='string'&&
   file.replaceAll('\\','/').endsWith('/node_modules/ffmpeg-static/ffmpeg'))){
   console.error('HH_OWNER_VIDEO_FFMPEG_NOT_TRACED')
   process.exit(1)
 }
 console.log('HH_OWNER_VIDEO_FFMPEG_TRACE_READY')
}
