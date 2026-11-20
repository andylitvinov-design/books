import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {coachNaturalTake,coachNaturalVideoPath,coachNaturalFilename} from '../lib/coaching/coach-natural-motion.mjs'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('all four coaches have two unique real MP4 take routes; speaking follows meaning',()=>{
 for(const id of ['mira','max','sofia','alex']){
  assert.equal(coachNaturalVideoPath(id,'idle'),'/images/holistic-house/my-coach-motion/'+id+'-natural-calm-v1.mp4')
  assert.equal(coachNaturalVideoPath(id,'listening'),'/images/holistic-house/my-coach-motion/'+id+'-natural-attentive-v1.mp4')
  assert.equal(coachNaturalVideoPath(id,'speaking','empathy'),'/images/holistic-house/my-coach-motion/'+id+'-natural-attentive-v1.mp4')
  assert.equal(coachNaturalVideoPath(id,'speaking','insight'),'/images/holistic-house/my-coach-motion/'+id+'-natural-calm-v1.mp4')
 }
 assert.equal(coachNaturalVideoPath('merlin'),null)
 assert.equal(coachNaturalVideoPath('harry'),null)
 assert.equal(coachNaturalVideoPath('unknown'),null)
 assert.equal(coachNaturalTake('idle','empathy'),'calm')
})
test('build filenames and every browser media path use the exact same asset',()=>{
 const build=source('scripts/prepare-my-coach-natural-mp4.mjs')
 assert.match(build,/coachNaturalFilename\(persona,take\)/)
 assert.doesNotMatch(build,/name\+'-natural-v1\\.mp4'/)
 for(const personaId of ['mira','sofia','max','alex']){
  for(const take of ['calm','attentive']){
   const expected=personaId+'-natural-'+take+'-v1.mp4'
   const actual=coachNaturalFilename(personaId,take)
   assert.equal(actual,expected)
   assert.equal(coachNaturalVideoPath(personaId,take==='attentive'?'listening':'idle').split('/').at(-1),expected)
  }
 }
 assert.equal(coachNaturalFilename('harry','calm'),null)
 assert.equal(coachNaturalFilename('mira','unknown'),null)
})
test('mounted player uses only natural owner-generated MP4, never the rejected face-warp loops',()=>{
 const player=source('components/my-coach-motion-media.jsx')
 const faceCss=source('components/app/coaching-avatar.module.css')
 assert.match(player,/coachNaturalVideoPath\(personaId,state,visualScene\)/)
 assert.doesNotMatch(player,/greeting-real-v3|MEDIA_ROOT\+personaId\+'-'\+clip\+'\.mp4'/)
 assert.doesNotMatch(player,/resource2\.heygen|https?:\/\//)
 assert.match(player,/muted loop playsInline autoPlay/)
 assert.match(player,/data-coach-natural-performance=/)
 assert.match(faceCss,/\.frame\[data-photo-persona\] \.illustration\{display:none!important\}/)
})
test('existing production build mirrors local silent H264, never calls video provider in user sessions',()=>{
 const build=source('scripts/prepare-my-coach-natural-mp4.mjs')
 const pkg=JSON.parse(source('package.json'))
 assert.match(pkg.scripts.prebuild,/node scripts\/prepare-my-coach-natural-mp4\.mjs/)
 assert.equal((build.match(/'(mira|sofia|max|alex)-(calm|attentive)':'01a1/g)||[]).length,8)
 assert.match(build,/VERCEL_ENV==='production'/)
 assert.match(build,/12000000/)
 assert.match(build,/900000/)
 assert.match(build,/-movflags','\+faststart'/)
 assert.match(build,/resource2\.heygen\.ai/)
 assert.match(build,/HH_COACH_NATURAL_MP4_STATIC_FALLBACK/)
 const proc=spawnSync(process.execPath,['scripts/prepare-my-coach-natural-mp4.mjs'],{
   cwd:new URL('../',import.meta.url),encoding:'utf8',timeout:8000,
   env:{...process.env,VERCEL_ENV:'preview',HH_COACH_NATURAL_BUILD:'0'}
 })
 assert.equal(proc.status,0,proc.stderr)
 assert.match(proc.stdout,/SKIP_NON_PROD/)
})
