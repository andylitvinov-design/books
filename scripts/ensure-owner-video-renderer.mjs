// Build-time guard: npm's install-script approval policy can skip ffmpeg-static's
// native download while still reporting a successful Next.js deployment.
// Run before Next builds; never download or execute dependency installers in
// a Telegram webhook or any user-facing request.
import {spawnSync} from 'node:child_process'
import {accessSync,constants,readFileSync,statSync} from 'node:fs'
import {createRequire} from 'node:module'
import {dirname,join} from 'node:path'

const require=createRequire(import.meta.url)
const BINARY=process.platform==='win32'?'ffmpeg.exe':'ffmpeg'

function binaryPath(){
 try{return join(dirname(require.resolve('ffmpeg-static')),BINARY)}
 catch{return null}
}
function binaryIsReady(){
 const executable=binaryPath()
 if(!executable)return false
 try{
   if(!statSync(executable).isFile()||statSync(executable).size<1_000_000)
     return false
   accessSync(executable,constants.X_OK)
   const probe=spawnSync(executable,['-hide_banner','-version'],{
     encoding:'utf8',timeout:10000,maxBuffer:256*1024
   })
   return !probe.error&&probe.status===0&&probe.stdout.startsWith('ffmpeg version')
 }catch{return false}
}
if(!binaryIsReady()){
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
