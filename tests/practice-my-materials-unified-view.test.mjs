import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {normalizeVideoPresentation} from '../lib/practitioners/presentation-contract.js'

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('the Practice public-video editor saves its draft in one tap',()=>{
 const panel=read('components/app/practice-materials.jsx')
 const workspace=read('components/app/practice-workspace.jsx')
 assert.match(panel,/async function apply\(e\)/)
 assert.match(panel,/const saved=await onSaveVideos\(next\)/)
 assert.match(panel,/saved===true/)
 assert.match(panel,/ptext\.saveVideo/)
 assert.match(workspace,/await fn\(\);await load\(\);return true/)
 assert.match(workspace,/return false/)
 assert.match(panel,/normalizeVideoPresentation/)
})

test('the public profile normalizes pasted YouTube tracking links',()=>{
 const clean=normalizeVideoPresentation({
  kind:'external',url:'https://youtu.be/24-RuhV-EV4?si=test-preview',
 })
 assert.deepEqual(clean,{
  kind:'external',url:'https://www.youtube.com/watch?v=24-RuhV-EV4',
 })
})

test('Practice shows separate private report media and moderated public videos',()=>{
 const practice=read('components/app/practice-workspace.jsx')
 const materials=read('components/app/practice-materials.jsx')
 const report=read('components/app/practice-report-materials.jsx')
 assert.match(practice,/isOwner=\{isOwner\}/)
 assert.match(materials,/tab==='reports'&&isOwner/)
 assert.match(materials,/privateItems\.length/)
 assert.match(materials,/videos\.length/)
 assert.match(materials,/PracticeReportMaterials/)
 assert.match(report,/aria-label=\{t\.title\}/)
 assert.match(report,/preload="none"/)
 assert.match(report,/controls playsInline/)
 assert.match(report,/nothing|Nothing|ничего|не отправятся|No /i)
 assert.doesNotMatch(report,/publish-library|saveProfile|submitProfile/)
})

test('private materials require a verified owner and never expose a raw storage URL',()=>{
 const api=read('app/api/app/[...path]/route.js')
 const access=read('lib/app/practitioner-access.js')
 const library=read('lib/clients/material-library.js')
 assert.match(api,/joined === 'practice\/report-materials'/)
 assert.match(api,/practitionerEmailAllowed\(actor\)/)
 assert.match(api,/await repo\.isPractitioner\(actor\)/)
 assert.match(api,/streamReadyMaterial\(config,path\[2\],request\)/)
 assert.match(api,/new NextResponse\(streamed\.body/)
 assert.match(api,/handle as HEAD/)
 assert.match(library,/from app_private\.practitioner_materials/)
 assert.match(access,/materials: '\/admin\/materials'/)
 assert.match(read('components/app/practice-report-materials.jsx'),/\/api\/app\/practice\/report-materials\//)
})

test('public profile stays a separately moderated YouTube/Vimeo link list',()=>{
 const materials=read('components/app/practice-materials.jsx')
 const contract=read('lib/practitioners/contracts.js')
 const service=read('lib/practitioners/presentation-contract.js')
 assert.match(materials,/onSubmitVideos/)
 assert.match(materials,/practitioner\?\.status==='submitted'/)
 assert.match(contract,/normalizeVideoPresentation\(\{kind:'external',url:item\.url\}\)/)
 assert.match(service,/\/watch\?v=/)
 assert.doesNotMatch(contract,/hh-client-private-media|hh-practitioner-presentations/)
})
