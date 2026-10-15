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
