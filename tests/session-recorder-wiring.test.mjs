import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('saved report and assessment editors retain owner gate and explicit recorder source',()=>{
 for(const [path,source] of [
 ['app/admin/consultations/[id]/edit/page.js','documentId={consultation.id}'],
 ['app/admin/documents/[id]/page.js','documentId={record.id}'],
 ['app/admin/prescriptions/[id]/page.js','documentId={prescription.id}'],
 ['app/admin/clients/[id]/assessments/[assessmentId]/edit/page.js','assessmentId={assessmentId}']]){
 const text=read(path);assert.ok(text.includes('requireAdminRequest()'));assert.ok(text.includes('deliveryEnabled()'));assert.ok(text.includes(source))
 }
})
test('Storage CSP expansion stays confined to explicit session/editor routes',()=>{
 const source=read('middleware.ts');const expression=source.split('const deliveryPath =')[1].split('const deliveryOrigin')[0].trim()
 const matches=new Function('pathname','return '+expression)
 for(const path of ['/admin/clients/a/assessments/b/edit','/admin/prescriptions/a','/admin/consultations/a/edit','/admin/documents/a','/admin/clients/a/sessions/b','/en/client/session/a','/ru/client/a/sessions/b'])assert.equal(matches(path),true,path)
 for(const path of ['/admin/login','/en/app/profile','/en/reports/a','/admin/clients/a/assessments/new','/admin/clients/a','/api/client/session/a','/en/academy/reiki'])assert.equal(matches(path),false,path)
 assert.ok(source.includes("process.env.HH_CLIENT_DELIVERY_ENABLED !== 'true' || !deliveryPath"))
})


test('owner preview contains client-scope materials only, not practitioner notes',()=>{
 const studio=read('components/admin-session-studio.jsx')
 assert.match(studio,/showClientPreview/)
 assert.match(studio,/filter\(item=>item.scope==='client'\)/)
 assert.match(studio,/ПРЕДПРОСМОТР · НЕ ОПУБЛИКОВАНО/)
 assert.match(studio,/Owner-only notes are omitted/)
 assert.match(studio,/action==='publish'/)
})


test('recording permission is granted only on authenticated practitioner editor URLs',()=>{
  const config=read('next.config.ts')
  assert.ok(config.includes('const practitionerRecordingSources = ['))
  const values=config.split('const practitionerRecordingSources = [')[1].split('];')[0]
  const sources=[...values.matchAll(/"([^"]+)"/g)].map(match=>match[1])
  assert.deepEqual(sources,[
    '/admin/consultations/:id/edit',
    '/admin/documents/:id',
    '/admin/prescriptions/:id',
    '/admin/clients/:id/assessments/:assessmentId/edit',
    '/admin/clients/:id/sessions/:path*',
  ])
  assert.ok(!sources.some(path=>/^\/(?:en|ru|es|api)/.test(path)))
  assert.ok(config.includes('value: "camera=(), microphone=(), geolocation=()"'))
  assert.ok(config.includes('value: "camera=(self), microphone=(self), geolocation=()"'))
  const global=config.indexOf('source: "/:path*"')
  const override=config.indexOf('...practitionerRecordingSources.map((source)')
  assert.ok(global!==-1 && override>global,'scoped policy must override the global denial last')
  const recorder=read('components/session-audio-recorder.jsx')
  assert.ok(recorder.includes('navigator.mediaDevices.getUserMedia'))
})
