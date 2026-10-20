import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  REIKI_INTRO_BUCKET, REIKI_INTRO_MANIFEST, REIKI_INTRO_LESSONS,
  REIKI_INTRO_MAX_BYTES, reikiIntroSlot, reikiIntroMime, reikiIntroAudioPath,
  reikiIntroPublicStorageOrigin, reikiIntroPublicUrl, readReikiIntroManifest,
  validReikiIntroAudioPath, validReikiIntroEntry,
  reikiIntroAudioFolder, reikiIntroPublicObjectUrl, reikiIntroInventoryFile,
} from '../lib/academy/reiki-intro-audio-model.js'
import { energyworkSequence } from '../data/academy/energywork-ai-schema.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url),'utf8')
const curriculum = read('data/academy/energywork-ai-curriculum.ts')
const learner = read('components/energywork-ai-learner.tsx')
const audioPlayer = read('components/reiki-lesson-intro-audio.tsx')
const adminUi = read('components/admin-reiki-audio.jsx')
const adminPage = read('app/admin/reiki-audio/page.jsx')
const materialsPage = read('app/admin/materials/page.js')
const audioFolderPage = read('app/admin/materials/audio/page.jsx')
const courseFolderPage = read('app/admin/materials/audio/reiki-practitioner/page.jsx')
const foldersCss = read('components/materials-audio-folders.module.css')
const audioCss = read('components/admin-reiki-audio.module.css')
const ownerRoute = read('app/admin/reiki-audio/data/route.js')
const publicRoute = read('app/api/reiki-intro-audio/route.js')
const store = read('lib/academy/reiki-intro-audio-store.js')
const csp = read('middleware.ts')
const cabinet = read('components/practitioner-cabinet.jsx')
const header = read('components/prescription-admin-header.jsx')
const css = read('components/energywork-ai-learner.module.css')

test('Four meditation introductions and the fifth initiation lesson preserve all existing slide IDs', () => {
  assert.equal(energyworkSequence().length, 69)
  const ids = [
    ['flight-01','flight-02','flight'],
    ['tan-01','tan-02','tantra'],
    ['kun-01','kun-02','kundalini'],
    ['ygg-01','ygg-02','yggdrasil'],
  ]
  assert.deepEqual([...REIKI_INTRO_LESSONS], ['flight','tantra','kundalini','yggdrasil','initiation'])
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
  const fifth = curriculum.split('id: "paths-01"')[1]?.split('id: "paths-02"')[0] || ''
  assert.match(fifth,/introAudioKey: "initiation"/)
  assert.match(fifth,/introTopics: \[/)
  assert.ok(energyworkSequence().includes('paths-01'))
  assert.match(audioPlayer,/\| "initiation"/)
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
  assert.match(adminUi,/action:\s*'publish'/)
  assert.match(adminUi,/action:\s*'unpublish'/)
  assert.match(cabinet,/href:'\/admin\/materials\/audio\/reiki-practitioner'/)
  assert.match(header,/href="\/admin\/materials\/audio\/reiki-practitioner"/)
  assert.match(csp,/reikiIntroAudioManager/)
  assert.match(csp,/reikiLessonAudioPage/)
  assert.match(csp,/reikiIntroAudioOrigin/)
  assert.doesNotMatch(store,/getSiteVideoStore|localStorage|client_delivery_assets|privateMediaObjectStream/)
})


test('Materials displays a true Audio → Reiki Practitioner → five lesson folder hierarchy', () => {
  assert.match(materialsPage,/data-materials-audio-folder/)
  assert.match(materialsPage,/href="\/admin\/materials\/audio"/)
  assert.match(audioFolderPage,/requireAdminRequest\(\)/)
  assert.match(audioFolderPage,/data-reiki-course-folder/)
  assert.match(audioFolderPage,/href="\/admin\/materials\/audio\/reiki-practitioner"/)
  assert.match(courseFolderPage,/requireAdminRequest\(\)/)
  assert.match(courseFolderPage,/data-master-reiki-lesson-audio-folders/)
  assert.match(courseFolderPage,/REIKI_INTRO_LESSONS\.includes\(query\?\.lesson\)/)
  assert.match(courseFolderPage,/initialLocale=\{language\} initialLesson=\{lesson\}/)
  assert.match(adminPage,/redirect\('\/admin\/materials\/audio\/reiki-practitioner'\)/)
  assert.match(foldersCss,/folderLink/)
  assert.match(audioCss,/folderButtons/)
  assert.match(audioCss,/grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(csp,/admin\\\/materials\\\/audio\\\/reiki-practitioner/)
})

test('Language toggle selects the same lesson with a distinct EN/RU audio folder', () => {
  for (const lesson of REIKI_INTRO_LESSONS) for (const lang of ['en','ru']) {
    const prefix = reikiIntroAudioFolder(lesson,lang)
    assert.equal(prefix, 'reiki-practitioner/intros/'+lesson+'/'+lang)
    assert.equal(reikiIntroAudioFolder(lesson,'es'), null)
  }
  assert.match(adminUi,/data-reiki-audio-language-toggle/)
  assert.match(adminUi,/aria-pressed=\{locale==='ru'\}/)
  assert.match(adminUi,/aria-pressed=\{locale==='en'\}/)
  assert.match(adminUi,/chooseLanguage\('ru'\)/)
  assert.match(adminUi,/chooseLanguage\('en'\)/)
  assert.match(adminUi,/data-reiki-lesson-folder=\{lesson\.id\}/)
  assert.match(adminUi,/setSelectedLesson\(lesson\)/)
  assert.match(adminUi,/key=\{chosen\.id\+':'.*locale\}/)
  assert.match(adminUi,/replaceUrl\(selectedLesson,language\)/)
  assert.match(adminUi,/data-reiki-audio-folder-contents/)
})

test('A lesson language folder lists safe uploaded audio, never client assets or other lesson paths', () => {
  const uuid='c'.repeat(32)
  const object={id:'file',name:uuid+'.mp3',
    metadata:{size:90000,mimetype:'audio/mpeg'},created_at:'2026-10-19T14:00:00.000Z'}
  const parsed=reikiIntroInventoryFile(object,'tantra','ru')
  assert.equal(parsed.path,'reiki-practitioner/intros/tantra/ru/'+uuid+'.mp3')
  assert.equal(parsed.bytes,90000)
  assert.equal(reikiIntroInventoryFile({...object,name:'../../secret.mp3'},'tantra','ru'),null)
  assert.equal(reikiIntroInventoryFile({...object,metadata:{size:1,mimetype:'audio/mpeg'}},'tantra','ru'),null)
  assert.equal(reikiIntroInventoryFile({...object,metadata:{size:90000,mimetype:'text/html'}},'tantra','ru'),null)
  assert.equal(reikiIntroInventoryFile({...object,id:null},'tantra','ru'),null)
  assert.equal(reikiIntroInventoryFile({...object,name:uuid+'.m4a'},'tantra','ru'),null)
  const origin='https://shervdixkaxurnaecioe.supabase.co'
  assert.equal(reikiIntroPublicObjectUrl(origin,parsed.path,'tantra','ru'),
    origin+'/storage/v1/object/public/'+REIKI_INTRO_BUCKET+'/'+parsed.path)
  assert.equal(reikiIntroPublicObjectUrl(origin,parsed.path,'kundalini','ru'),null)
  assert.match(store,/storage\.list\(folder,/)
  assert.match(store,/reikiIntroInventoryFile\(file, lesson, locale\)/)
  assert.match(ownerRoute,/params\.get\('lesson'\)/)
  assert.match(ownerRoute,/params\.get\('locale'\)/)
  assert.match(ownerRoute,/reikiIntroAudioAdminRead\(config, \{ lesson, locale \}\)/)
  assert.match(ownerRoute,/Cache-Control': 'private, no-store/)
})

test('Several saved audio files can be previewed; only one is assigned to the lesson after consent', () => {
  assert.match(adminUi,/data-reiki-audio-folder-contents/)
  assert.match(adminUi,/files\.map\(\(item\)=>/)
  assert.match(adminUi,/data-reiki-audio-file=\{item\.path\}/)
  assert.match(adminUi,/setStaged\(\{path:item\.path,fileName:null\}\)/)
  assert.match(adminUi,/reikiIntroPublicObjectUrl\(origin,staged\.path,lesson\.id,locale\)/)
  assert.match(adminUi,/type="file"/)
  assert.match(adminUi,/uploadToSignedUrl/)
  assert.match(adminUi,/window\.confirm\(copy\.confirmPublish\)/)
  assert.match(adminUi,/action:'publish'/)
  assert.match(adminUi,/action:'unpublish'/)
  assert.match(adminUi,/setOperationBusy\(true\)/)
  assert.match(adminUi,/setOperationBusy\(false\)/)
  assert.doesNotMatch(adminUi,/autoPlay|autoplay|youtube\.com/)
})
