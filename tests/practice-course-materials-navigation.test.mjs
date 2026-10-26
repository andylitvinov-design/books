import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { courseMediaCspFixture, syntheticMediaOrigin } from './helpers/course-media-csp-fixture.mjs'

const source = name => readFileSync(new URL('../'+name,import.meta.url),'utf8')

const workspace=source('components/app/practice-workspace.jsx')
const materialTab=source('components/app/practice-materials.jsx')
const access=source('lib/app/practitioner-access.js')
const backend=source('app/api/app/[...path]/route.js')
const ownerPage=source('app/admin/materials/courses/reiki-practitioner/page.jsx')
const folderPage=source('app/admin/materials/courses/page.jsx')
const middleware=source('middleware.ts')
const audio=source('components/admin-reiki-audio.jsx')

test('My Practice Materials offers Reiki course recordings only to the owner',()=>{
  assert.match(workspace,/isOwner=\{isOwner\} onOpenReikiCourse=\{\(lesson,mode\)=>openOwner\('reikiCourse',undefined,lesson,mode\)\}/)
  assert.match(materialTab,/<button type="button" role="tab"[\s\S]{0,200}data-practice-materials-courses-tab/)
  assert.match(materialTab,/tab==='courses'\?<section/)
  // The universal authoring tool is visible to masters, but Reiki recordings
  // and owner-only lesson shortcuts are still guarded separately.
  assert.match(materialTab,/\{isOwner&&<div\b/)
  assert.match(materialTab,/onClick=\{\(\)=>onOpenReikiCourse\?\.\(\)\} data-open-reiki-course-audio/)
  assert.match(materialTab,/Практик Рейки/)
  assert.match(materialTab,/Reiki Practitioner/)
  assert.match(materialTab,/Practicante de Reiki/)
  assert.match(materialTab,/data-practice-materials-audio-tab/)
  assert.match(materialTab,/data-unified-material-nav/)
  assert.match(materialTab,/lang|locale/)
  assert.match(access,/reikiCourse: '\/admin\/materials\/courses\/reiki-practitioner'/)
  assert.match(backend,/if \(joined === 'practitioner\/open' && method === 'POST'\)/)
  assert.match(backend,/practitionerEmailAllowed\(actor\) \|\| !await repo\.isPractitioner\(actor\)/)
  assert.match(backend,/issueTrustedAdminSession\(response/)
})

test('New Routes reuse protected audio editor without spawning duplicate media storage',()=>{
  assert.match(folderPage,/requireAdminRequest\(\)/)
  assert.match(ownerPage,/requireAdminRequest\(\)/)
  assert.match(ownerPage,/REIKI_INTRO_LESSONS\.includes\(query\?\.lesson\)/)
  assert.match(ownerPage,/\['ru','en'\]\.includes\(query\?\.lang\)/)
  assert.match(ownerPage,/<AdminReikiAudio initialLocale=\{language\} initialLesson=\{lesson\} initialMode=/)
  assert.match(audio,/uploadToSignedUrl/)
  assert.match(audio,/action:'publish'/)
  assert.match(audio,/action:'preview'/)
  assert.match(audio,/action:'unpublish'/)
  assert.doesNotMatch(audio,/autoPlay|autoplay/)
})

test('Canonical course editor CSP permits scoped private draft upload and preview',async()=>{
  await assertOwnerAudioPolicy(middleware)
})

async function assertOwnerAudioPolicy(source) {
  const policy=courseMediaCspFixture(source)
  for(const path of ['/admin/materials/courses/reiki-practitioner','/admin/materials/coaching/egyptian','/admin/materials/coaching/greek/']) {
    const csp=await policy(path)
    assert.ok(csp['media-src'].includes('blob:'),path+' requires owner-only local preview')
    for(const directive of ['media-src','connect-src']) assert.ok(csp[directive].includes(syntheticMediaOrigin),path+' requires signed upload/playback origin')
  }
  for(const path of ['/en/academy/principles-of-energywork/learn','/ru/academy/principles-of-energywork/learn/','/es/academy/principles-of-energywork/learn','/en/app/coaching/egyptian','/ru/app/coaching/greek']) {
    const csp=await policy(path)
    assert.ok(csp['media-src'].includes(syntheticMediaOrigin),path+' requires audio playback')
    assert.ok(!csp['connect-src'].includes(syntheticMediaOrigin),path+' must not inherit owner upload connection')
    assert.ok(!csp['media-src'].includes('blob:'),path+' must not inherit owner local preview')
  }
  for(const path of ['/','/en/client','/ru/app/account','/admin','/api/app/course','/admin/materials/courses/reiki-practitioner/unrelated','/admin/materials/coaching/unknown']) {
    const csp=await policy(path)
    for(const directive of ['media-src','connect-src']) assert.ok(!csp[directive].includes(syntheticMediaOrigin),path+' must not inherit private audio origin')
    assert.ok(!csp['media-src'].includes('blob:'),path+' must not inherit local audio preview')
  }
}

test('owner audio policy rejects invalid Storage origins without losing local preview',async()=>{
  const policy=courseMediaCspFixture(middleware)
  for(const origin of ['', 'not-a-url', 'http://abcdefghijklmnopqrst.supabase.co', 'https://example.invalid', 'https://abcdefghijklmnopqrst.supabase.co.evil.invalid']) {
    const csp=await policy('/admin/materials/courses/reiki-practitioner',origin)
    assert.deepEqual(csp['media-src'],["'self'",'blob:'])
    assert.deepEqual(csp['connect-src'],["'self'"])
  }
})

test('owner audio CSP contract rejects lost upload and learner upload grants',async()=>{
  const condition="((reikiIntroAudioManager||coachingOwnerAudioManager) ? reikiIntroAudioOrigin : '')"
  const missing=middleware.replace(condition,"''")
  const broadened=middleware.replace(condition,'reikiIntroAudioOrigin')
  assert.notEqual(missing,middleware)
  assert.notEqual(broadened,middleware)
  await assert.rejects(assertOwnerAudioPolicy(missing),/requires signed upload\/playback origin/)
  await assert.rejects(assertOwnerAudioPolicy(broadened),/must not inherit owner upload connection/)
})

test('CSP fixture rejects unrecognized dependencies instead of silently stubbing them',async()=>{
  const policy=courseMediaCspFixture("import './unexpected-csp-dependency';\n"+middleware)
  await assert.rejects(policy('/admin/materials/courses/reiki-practitioner'),/Unexpected CSP fixture import/)
})
