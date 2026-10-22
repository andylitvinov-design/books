import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {normalizeVideoPresentation} from '../lib/practitioners/presentation-contract.js'

const read=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8')

test('report materials and public video drafts are distinct in Practice',()=>{
 const panel=read('components/app/practice-materials.jsx')
 assert.match(panel,/PracticeReportMaterials/)
 assert.match(panel,/\/api\/app\/practice\/report-materials/)
 assert.match(panel,/items=\{reportItems\}/)
 assert.match(panel,/videos\.length/)
 assert.match(panel,/reportMode!=='not-owner'/)
 assert.match(panel,/tab==='reports'/)
 const privateView=read('components/app/practice-report-materials.jsx')
 assert.match(privateView,/preload="none"/)
 assert.match(privateView,/<video controls autoPlay playsInline/)
 assert.match(privateView,/<audio controls preload="none"/)
 assert.doesNotMatch(privateView,/<audio[^>]+autoPlay/)
 assert.match(privateView,/\/api\/app\/practice\/report-materials\//)
 assert.doesNotMatch(privateView,/publish-library|onSubmitVideos/)
})

test('the public video form saves immediately to a draft, not a live page',()=>{
 const panel=read('components/app/practice-materials.jsx')
 const workspace=read('components/app/practice-workspace.jsx')
 assert.match(panel,/await onSaveVideos\(next\)/)
 assert.match(panel,/if\(await persist\(next,t\.saved\)\)/)
 assert.match(panel,/t\.autoSaved/)
 assert.match(workspace,/\{rethrow:true\}/)
 assert.match(panel,/onSubmitVideos/)
 assert.match(panel,/canonicalVideoUrl/)
 const clean=normalizeVideoPresentation({kind:'external',url:'https://youtu.be/24-RuhV-EV4?si=test'})
 assert.equal(clean.url,'https://www.youtube.com/watch?v=24-RuhV-EV4')
})

test('private library API requires the exact verified practice owner on every GET and Range request',()=>{
 const api=read('app/api/app/[...path]/route.js')
 assert.match(api,/joined === 'practice\/report-materials'/)
 assert.match(api,/practitionerEmailAllowed\(actor\)/)
 assert.match(api,/await repo\.isPractitioner\(actor\)/)
 assert.match(api,/streamReadyMaterial\(config,path\[2\],request\)/)
 assert.match(api,/auth\.apply\(new NextResponse\(streamed\.body/)
 assert.match(api,/handle as HEAD/)
 const view=read('components/app/practice-report-materials.jsx')
 assert.match(view,/destination:'materials'/)
 assert.match(view,/data\.redirectUrl!=='\/admin\/materials'/)
 const access=read('lib/app/practitioner-access.js')
 assert.match(access,/materials: '\/admin\/materials'/)
})

test('public profile contracts do not accept private Storage URLs',()=>{
 const source=read('lib/practitioners/presentation-contract.js')
 const practice=read('components/app/practice-materials.jsx')
 assert.match(source,/normalizeVideoPresentation/)
 assert.match(practice,/Submit for review/)
 assert.doesNotMatch(source,/hh-client-private-media/)
})
