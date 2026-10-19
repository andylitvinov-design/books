import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { ownerClientSummary, ownerClientDirectory, ownerClientDocumentSummary } from '../lib/clients/owner-client-directory.js'

const sample=(id,name,extra={})=>({
  id,fullName:name,status:'active',createdAt:'2026-10-01T08:00:00.000Z',updatedAt:'2026-10-02T08:00:00.000Z',...extra,
})
const a='cfd3473e-1c44-4875-838f-029e2daae8a1'
const b='bef7d7ed-f2d7-4056-af63-f659b14e3e8b'

test('manual clients work without email and never expose notes, cabinet access or medical data',()=>{
  const record=sample(a,'Old Client',{email:'',phone:'123 456',notes:'PRIVATE NOTES',cabinetAccess:{secretHash:'sensitive'},sharedMaterials:[{title:'private'}],medicalRecord:'SECRET'})
  assert.deepEqual(ownerClientSummary(record),{
    id:a,name:'Old Client',email:'',phone:'123 456',status:'active',
    createdAt:'2026-10-01T08:00:00.000Z',updatedAt:'2026-10-02T08:00:00.000Z',
  })
  assert.equal(ownerClientSummary({...record,id:'../other'}),null)
  assert.equal(ownerClientSummary({...record,fullName:''}),null)
})

test('manual records stay distinct even with matching name/contact and newest appears first',()=>{
  const records=ownerClientDirectory([
    sample(a,'Same name',{updatedAt:'2026-10-02T08:00:00Z'}),
    sample(b,'Same name',{updatedAt:'2026-10-09T08:00:00Z'}),
  ])
  assert.deepEqual(records.map(item=>item.id),[b,a])
  assert.equal(records.length,2)
})

test('legacy document summary discloses only count and latest date, not report contents',()=>{
  const result=ownerClientDocumentSummary([
    {dateIssued:'2026-10-02',script:'sensitive medical text'},
    {dateIssued:'2026-10-12',notes:'private'},
  ])
  assert.deepEqual(result,{documentCount:2,latestDocumentDate:'2026-10-12'})
})

test('owner clinical client read and deep links remain authenticated and separate from request profiles',async()=>{
  const [route,view,workspace,styles]=await Promise.all([
    readFile(new URL('../app/api/app/[...path]/route.js',import.meta.url),'utf8'),
    readFile(new URL('../components/app/practitioner-client-profiles.jsx',import.meta.url),'utf8'),
    readFile(new URL('../components/app/practice-workspace.jsx',import.meta.url),'utf8'),
    readFile(new URL('../components/app/practitioner-client-profiles.module.css',import.meta.url),'utf8'),
  ])
  assert.match(route,/joined === 'practitioner\/legacy-clients' && method === 'GET'/)
  assert.match(route,/practitionerEmailAllowed\(actor\) \|\| !await repo\.isPractitioner\(actor\)/)
  assert.match(route,/getPrescriptionStore\(\)/)
  assert.match(route,/ownerClientDirectory\(await store\.listClients\(\)\)/)
  assert.match(route,/requireUUID\(clientId\)/)
  assert.match(route,/store\.listClientDocuments\(clientId\)/)
  assert.match(route,/body\.destination === 'client'/)
  assert.match(route,/requireUUID\(body\.clientId\)/)
  assert.match(route,/issueTrustedAdminSession\(response/)
  assert.match(view,/if\(!isOwner\|\|!accountId\)return/)
  assert.match(view,/manualClients\.filter/)
  assert.match(view,/matchingManual\.slice\(0,manualVisible\)/)
  assert.match(view,/setManualVisible\(count=>count\+5\)/)
  assert.match(view,/filtered\.slice\(0,enquiryVisible\)/)
  assert.match(view,/setEnquiryVisible\(count=>count\+5\)/)
  assert.match(view,/onOpenLegacy\?\.\(client\.id\)/)
  assert.match(workspace,/onOpenLegacy=\{clientId=>openOwner\(clientId\?'client':'clients',clientId\)\}/)
  assert.match(styles,/\.manualClient\{/)
})
