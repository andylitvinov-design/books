import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  REIKI_INTRO_BUCKET, REIKI_INTRO_MANIFEST, REIKI_INTRO_LESSONS,
  REIKI_INTRO_MAX_BYTES, reikiIntroSlot, reikiIntroMime, reikiIntroAudioPath,
  reikiIntroPublicStorageOrigin, reikiIntroPublicUrl, readReikiIntroManifest,
  validReikiIntroAudioPath, validReikiIntroEntry,
} from '../lib/academy/reiki-intro-audio-model.js'
import { energyworkSequence } from '../data/academy/energywork-ai-schema.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url),'utf8')
const curriculum = read('data/academy/energywork-ai-curriculum.ts')
const learner = read('components/energywork-ai-learner.tsx')
const audioPlayer = read('components/reiki-lesson-intro-audio.tsx')
const adminUi = read('components/admin-reiki-audio.jsx')
const adminPage = read('app/admin/reiki-audio/page.jsx')
const ownerRoute = read('app/admin/reiki-audio/data/route.js')
const publicRoute = read('app/api/reiki-intro-audio/route.js')
const store = read('lib/academy/reiki-intro-audio-store.js')
const csp = read('middleware.ts')
const cabinet = read('components/practitioner-cabinet.jsx')
const header = read('components/prescription-admin-header.jsx')
const css = read('components/energywork-ai-learner.module.css')

test('Four existing lesson-intro slides remain immediately before their meditation, no lost progress', () => {
  assert.equal(energyworkSequence().length, 69)
  const ids = [
    ['flight-01','flight-02','flight'],
    ['tan-01','tan-02','tantra'],
    ['kun-01','kun-02','kundalini'],
    ['ygg-01','ygg-02','yggdrasil'],
  ]
  assert.deepEqual([...REIKI_INTRO_LESSONS], ['flight','tantra','kundalini','yggdrasil'])
  for (const [intro, meditation, key] of ids) {
    const seq = energyworkSequence()
    assert.equal(seq.indexOf(meditation),seq.indexOf(intro)+1)
    const start = curriculum.indexOf('id: "'+intro+'"')
    const end = curriculum.indexOf('id: "'+meditation+'"',start)
    assert.ok(start > 0 && end > start)
    const block = curriculum.slice(start,end)
    assert.match(block,/introTopics: \[/)
    assert.equal((block.match(/\n\s+l\("/g)||[]).length >= 3,true)
    assert.ok(block.includes('introAudioKey: "'+key+'"'))
  }
  assert.match(learner,/data-reiki-lesson-intro=\{slide\.introAudioKey\}/)
  assert.match(learner,/<ReikiLessonIntroAudio/)
  assert.match(learner,/slide\.introTopics\.map/)
  assert.match(css,/lessonIntroPanel/)
  assert.match(css,/overflow-y: auto/)
})

test('Audio formats and immutable object paths are tightly constrained to separate public bucket', () => {
  assert.equal(REIKI_INTRO_BUCKET,'hh-reiki-course-audio')
  assert.equal(REIKI_INTRO_MANIFEST,'reiki-practitioner/intro-manifest-v1.json')
  assert.equal(REIKI_INTRO_MAX_BYTES,20000000)
  assert.equal(reikiIntroMime('audio/mpeg','voice.mp3'),'audio/mpeg')
  assert.equal(reikiIntroMime('audio/mp4','voice.m4a'),'audio/mp4')
  assert.equal(reikiIntroMime('','recording.M4A'),'audio/mp4')
  assert.equal(reikiIntroMime('','recording.mp3'),'audio/mpeg')
  assert.equal(reikiIntroMime('text/html','voice.mp3'),null)
  assert.equal(reikiIntroMime('audio/webm','recording.mp3'),null)
  assert.equal(reikiIntroSlot('tantra','ru'),'tantra:ru')
  assert.equal(reikiIntroSlot('private','ru'),null)
  const uuid='a'.repeat(32)
  const key=reikiIntroAudioPath('tantra','ru',uuid,'audio/mpeg')
  assert.equal(key,'reiki-practitioner/intros/tantra/ru/'+uuid+'.mp3')
  assert.equal(validReikiIntroAudioPath(key,'tantra','ru'),true)
  for(const bad of [key.replace('tantra','kundalini'),key+'?x=1',key.replace(uuid,'../../secret'),'/'+key])
    assert.equal(validReikiIntroAudioPath(bad,'tantra','ru'),false)
})

test('Manifest includes only explicitly published, correctly typed audio and safe public URLs', () => {
  const sha='b'.repeat(32)
  const valid={path:reikiIntroAudioPath('yggdrasil','en',sha,'audio/mp4'),
    mime:'audio/mp4',bytes:105000,publishedAt:'2026-10-19T19:00:00.000Z'}
  assert.equal(validReikiIntroEntry(valid,'yggdrasil','en'),true)
  assert.equal(validReikiIntroEntry({...valid,bytes:30000000},'yggdrasil','en'),false)
  assert.equal(validReikiIntroEntry({...valid,mime:'text/html'},'yggdrasil','en'),false)
  const manifest=readReikiIntroManifest({version:1,slots:{
    'yggdrasil:en': valid,
    'tantra:ru': {...valid,path:'https://attacker.example.com/trap'},
    'other:ru': valid,
  }})
  assert.deepEqual(Object.keys(manifest.slots),['yggdrasil:en'])
  const origin='https://shervdixkaxurnaecioe.supabase.co'
  assert.equal(reikiIntroPublicStorageOrigin(origin),origin)
  assert.equal(reikiIntroPublicStorageOrigin('http://shervdixkaxurnaecioe.supabase.co'),null)
  assert.equal(reikiIntroPublicStorageOrigin('https://attacker.example.com'),null)
  assert.equal(reikiIntroPublicStorageOrigin(origin+'/evil'),null)
  assert.equal(reikiIntroPublicUrl(origin,valid,'yggdrasil','en'),
    origin+'/storage/v1/object/public/'+REIKI_INTRO_BUCKET+'/'+valid.path)
  assert.equal(reikiIntroPublicUrl(origin,valid,'tantra','en'),null)
})

test('Owner only can sign uploads, explicit publish is separated, and no credentials reach public routes', () => {
  assert.match(adminPage,/requireAdminRequest\(\)/)
  assert.match(ownerRoute,/requireAdminRequest\(\)/)
  assert.match(ownerRoute,/requireSameOrigin\(request, config\)/)
  assert.match(ownerRoute,/body\?\.action === 'prepare'/)
  assert.match(ownerRoute,/body\?\.action === 'publish'/)
  assert.match(ownerRoute,/body\?\.action === 'unpublish'/)
  assert.match(ownerRoute,/body\.confirmed === true/)
  assert.match(store,/createSignedUploadUrl\(path\)/)
  assert.match(store,/storage\.info\(path\)/)
  assert.match(store,/upsert: true/)
  assert.match(store,/readStoredManifest\(storage\)/)
  assert.match(store,/publi[c]?ReikiIntroAudio|publicReikiIntroAudio/)
  assert.match(store,/hh-client-private-media/)
  assert.doesNotMatch(publicRoute,/getAppConfig|requireAdminRequest|secretKey|publishableKey/)
  assert.match(publicRoute,/reikiIntroSlot\(lesson, locale\)/)
  assert.match(store,/reikiIntroPublicUrl\(origin, entry, lesson, locale\)/)
})

test('Native audio stays optional, zero autoplay, and is managed from the practitioner cabinet', () => {
  assert.match(audioPlayer,/<audio controls preload="none"/)
  assert.doesNotMatch(audioPlayer,/autoPlay|autoplay|speechSynthesis/)
  assert.match(audioPlayer,/fetch\("\/api\/reiki-intro-audio/)
  assert.match(audioPlayer,/controller\.abort\(\)/)
  assert.match(adminUi,/type="file"/)
  assert.match(adminUi,/uploadToSignedUrl/)
  assert.match(adminUi,/URL\.createObjectURL/)
  assert.match(adminUi,/setStaged/)
  assert.match(adminUi,/action: 'publish'/)
  assert.match(adminUi,/action: 'unpublish'/)
  assert.match(cabinet,/href:'\/admin\/reiki-audio'/)
  assert.match(header,/href="\/admin\/reiki-audio"/)
  assert.match(csp,/reikiIntroAudioManager/)
  assert.match(csp,/reikiLessonAudioPage/)
  assert.match(csp,/reikiIntroAudioOrigin/)
  assert.doesNotMatch(store,/getSiteVideoStore|localStorage|client_delivery_assets|privateMediaObjectStream/)
})
