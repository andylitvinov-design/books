import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import {spawnSync} from 'node:child_process'
import {coachNaturalTake,coachNaturalVideoPath,coachNaturalFilename,coachVideoPosterPath} from '../lib/coaching/coach-natural-motion.mjs'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('all four coaches have two unique real MP4 take routes; speaking follows meaning',()=>{
 for(const id of ['mira','max','sofia','alex']){
  assert.equal(coachNaturalVideoPath(id,'idle'),'/images/holistic-house/my-coach-motion/'+id+'-natural-calm-v2.mp4')
  assert.equal(coachNaturalVideoPath(id,'listening'),'/images/holistic-house/my-coach-motion/'+id+'-natural-attentive-v2.mp4')
  assert.equal(coachNaturalVideoPath(id,'speaking','empathy'),'/images/holistic-house/my-coach-motion/'+id+'-natural-attentive-v2.mp4')
  assert.equal(coachNaturalVideoPath(id,'speaking','insight'),'/images/holistic-house/my-coach-motion/'+id+'-natural-calm-v2.mp4')
 }
 assert.equal(coachNaturalVideoPath('merlin'),null)
 assert.equal(coachNaturalVideoPath('harry'),null)
 assert.equal(coachNaturalVideoPath('unknown'),null)
 assert.equal(coachNaturalTake('idle','empathy'),'calm')
})
test('build filenames and every browser media path use the exact same asset',()=>{
 for(const personaId of ['mira','sofia','max','alex']){
  for(const take of ['calm','attentive']){
   const expected=personaId+'-natural-'+take+'-v2.mp4'
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
// SHA-256 of only the original encoded video packets (ffmpeg -c:v copy -f streamhash).
// Production MP4s have a single contiguous H.264 track, so mdat has the same digest.
const originalVideoTracks = [
  ['mira-natural-calm-v2.mp4', '64323602b24d65f4121a395ac785266954b313b8a569be751afd3722b369a1e4', 480, 672],
  ['mira-natural-attentive-v2.mp4', '24203afcc3bebf0bf878f6f69eec7fb36cdf1a289e34f8445f6f5d2384d8a78d', 480, 672],
  ['sofia-natural-calm-v2.mp4', '7aef716fec5bdd3dcb80060b102bf6665979e7c21809c9f447f760d7a3b7e86b', 480, 672],
  ['sofia-natural-attentive-v2.mp4', 'a7f1a2c35c3983b8c5a18e4f9c927f794aa63ba900cf44b6973da700e71c7056', 480, 672],
  ['max-natural-calm-v2.mp4', 'cd5f6643084de04493de5be2f65efc31d6edfaf8c1fb94df129381458f02f8cc', 480, 672],
  ['max-natural-attentive-v2.mp4', 'f1d2f7d3390808e90bf00f53ebde8f7ceb35f815c5d66b0ea780f076242fbb94', 480, 672],
  ['alex-natural-calm-v2.mp4', '5998bdfefb4ffa16e51fd8c82cd54a06c51e86735e4d053485ca842a3bfa5fd6', 480, 672],
  ['alex-natural-attentive-v2.mp4', '332a33121bcacd4a72b0844907cb978276ca4424ab4ba1094d62a54cebf9d7a6', 480, 672],
  ['harry-greeting-real-v2.mp4', '693495c2b78e6c56cb6fdb6d7483aafd4688c04cb52a3203b45a08fcd4b79966', 768, 1344],
  ['merlin-greeting-real-v2.mp4', '7ea01d67b6c309e2df60be1b876701c1a2687709b21016b26f39bb6cd84793e9', 768, 1152],
  ['harry-soft-calm.mp4', 'ee576de9ec957e4820ef8fbfe2ea852dff649320e09e8e1f1b2e8bea31affd41', 360, 644],
  ['harry-soft-attentive.mp4', '6af7f323ebc4dcf8bc6e424b560c8b504fa4223fa434874415a070e2fc517f55', 360, 644]
]
test('all twelve selected MP4s preserve the source video stream and have native WebP posters', async () => {
  const directory = new URL('../public/images/holistic-house/my-coach-motion/', import.meta.url)
  for (const [name, expectedHash, width, height] of originalVideoTracks) {
    const video = readFileSync(new URL(name, directory))
    const boxes = []
    const hash = createHash('sha256')
    for (let offset = 0; offset < video.length;) {
      const size = video.readUInt32BE(offset)
      const type = video.toString('ascii', offset + 4, offset + 8)
      assert.ok(size >= 8 && offset + size <= video.length, name + ' invalid box ' + type)
      boxes.push(type)
      if (type === 'mdat') hash.update(video.subarray(offset + 8, offset + size))
      offset += size
    }
    assert.equal(boxes[0], 'ftyp', name)
    assert.ok(boxes.includes('moov') && boxes.indexOf('moov') < boxes.indexOf('mdat'), name)
    assert.equal(hash.digest('hex'), expectedHash, name + ' changed source video')
    const poster = await sharp(readFileSync(new URL(coachVideoPosterPath(name), directory))).metadata()
    assert.equal(poster.format, 'webp', name)
    assert.deepEqual([poster.width, poster.height], [width, height], name + ' poster dimensions')
  }
  assert.equal(coachVideoPosterPath(null), null)
  assert.equal(coachVideoPosterPath('unrelated.png'), null)
})
test('production prepares legacy URLs from versioned files without recompressing the native video', async () => {
 const build = source('scripts/prepare-my-coach-natural-mp4.mjs')
 const pkg = JSON.parse(source('package.json'))
 assert.match(pkg.scripts.prebuild, /node scripts\/prepare-my-coach-natural-mp4\.mjs/)
 assert.match(build, /copyFile\(current, legacy\)/)
 assert.match(build, /'-v1\.mp4'/)
 assert.doesNotMatch(build, /spawnSync|ffmpeg|fetch\(/)
 const proc = spawnSync(process.execPath, ['scripts/prepare-my-coach-natural-mp4.mjs'], {
   cwd: new URL('../',import.meta.url), encoding: 'utf8', timeout: 70000,
   env: {...process.env, VERCEL_ENV: 'preview', HH_COACH_NATURAL_BUILD: '0'}
 })
 assert.equal(proc.status, 0, proc.stderr)
 assert.match(proc.stdout, /SKIP_NON_PROD/)
 assert.match(proc.stdout, /HH_SAMIR_OPENING_POSTER genie-natural-(?:idle-v1|encourage-v2)\.mp4/)
 const poster = await sharp(readFileSync(new URL('../public/images/holistic-house/my-coach-motion/genie-natural-opening-v2.webp',import.meta.url))).metadata()
 assert.equal(poster.format, 'webp')
 assert.ok(poster.width > 0 && poster.height > 0)
})

test('coach video can expand to the full hero width while typed replies restore without resetting the live session',()=>{
 const dialogue=source('components/my-coach-live-dialogue.jsx')
 const portraitCss=source('components/my-coach-live-dialogue.module.css')
 assert.match(dialogue,/const \[viewExpanded,setViewExpanded\]=useState\(false\)/)
 assert.match(dialogue,/data-coach-view-expanded=\{viewExpanded\?'true':'false'\}/)
 assert.match(dialogue,/data-coach-view-toggle/)
 assert.match(dialogue,/aria-pressed=\{viewExpanded\}/)
 assert.match(dialogue,/setViewExpanded\(value=>!value\)/)
 assert.match(dialogue,/if\(viewExpanded\)\{\s*setViewExpanded\(false\)/)
 assert.match(dialogue,/window\.requestAnimationFrame\(\(\)=>composerRef\.current\?\.focus\(\)\)/)
 assert.match(dialogue,/<MyCoachMotionMedia personaId=\{personaId\}/)
 assert.match(portraitCss,/\.root\[data-coach-view-expanded='true'\] \.sessionPortrait :global\(\[data-coach-motion-context='session'\]\)/)
 assert.match(portraitCss,/inset:0;width:100%;height:100%;max-width:none/)
 assert.match(portraitCss,/\.root\[data-coach-view-expanded='true'\] \.sessionPortrait\[data-persona\]\{\s*background-image:none!important/)
 assert.match(portraitCss,/\.root\[data-coach-view-expanded='true'\] \.textComposer\{display:none!important\}/)
 assert.match(portraitCss,/\.root\[data-coach-view-expanded='true'\] \.sessionHeroShade\{/)
})

test('Samir uses three first-party MP4 reactions without lip-sync or inference',async()=>{
 const {samirMotionTake,samirMotionPath}=await import('../lib/coaching/samir-motion.mjs')
 const motion=source('components/my-coach-motion-media.jsx')
 const layered=source('components/samir-motion-videos.jsx')
 const build=source('scripts/prepare-samir-motion-mp4.mjs')
 assert.equal(samirMotionTake('greeting','welcome'),'idle')
 assert.equal(samirMotionTake('thinking','calm'),'listening')
 assert.equal(samirMotionTake('listening','encourage'),'listening')
 assert.equal(samirMotionTake('speaking','empathy'),'idle')
 assert.equal(samirMotionTake('speaking','action'),'encourage')
 assert.equal(samirMotionPath('encourage'),
  '/images/holistic-house/my-coach-motion/genie-natural-encourage-v2.mp4')
 assert.match(motion,/samirMotionTake\(state,visualScene\)/)
 assert.match(motion,/<SamirMotionVideos take=\{samirTake\}/)
 assert.match(layered,/muted playsInline loop=\{!cycle\|\|next===name\}/)
 assert.doesNotMatch(layered,/heygen\.ai|fetch\(|speechSynthesis/)
 assert.match(build,/HH_SAMIR_MOTION/)
 const approved=readFileSync(new URL('../public/images/holistic-house/my-coach-motion/genie-natural-encourage-v2.mp4',import.meta.url))
 assert.equal(approved.toString('ascii',4,8),'ftyp')
 assert.ok(approved.includes(Buffer.from('avc1')))
 assert.equal(approved.includes(Buffer.from('soun')),false)
})
