import { readFile } from 'node:fs/promises'
import test from 'node:test'
import assert from 'node:assert/strict'
import { documentActionUrls, remedyCountLabel, resultLocale, createDocumentLinkCache } from '../lib/consultations/result-actions.js'

test('all admin actions explicitly carry selected locale for either document',()=>{
 for(const id of ['receipt-id','recommendation-id'])for(const locale of ['en','ru']){
  const urls=documentActionUrls(id,locale)
  assert.equal(urls.open,`/admin/documents/${id}?locale=${locale}`)
  assert.equal(urls.pdf,`/admin/api/documents/${id}/pdf?locale=${locale}`)
  assert.equal(urls.print,`/admin/documents/${id}?locale=${locale}&print=1`)
 }
})
test('preference defaults and remedy grammar',()=>{
 assert.equal(resultLocale('ru'),'ru');assert.equal(resultLocale('en'),'en');assert.equal(resultLocale(undefined),'en');assert.equal(resultLocale('invalid'),'en')
 assert.equal(remedyCountLabel(1),'1 remedy');assert.equal(remedyCountLabel(2),'2 remedies')
})
test('EN RU EN and concurrent copies reuse exactly one credential request per document',async()=>{
 let issued=0;const cache=createDocumentLinkCache(async()=>{issued++;return {selector:'synthetic-selector',secret:'synthetic-secret'}})
 const urls=await Promise.all(['en','ru','en'].map(locale=>cache.url(locale,'https://preview.invalid')))
 assert.equal(issued,1)
 assert.equal(urls[0],urls[2]);assert.equal(urls[1],'https://preview.invalid/ru/prescriptions/synthetic-selector#synthetic-secret')
 const other=createDocumentLinkCache(async()=>({selector:'other',secret:'independent'}))
 assert.notEqual(new URL(await other.url('ru','https://preview.invalid')).hash,new URL(urls[1]).hash)
})
test('failed credential request can retry without caching an error',async()=>{
 let calls=0;const cache=createDocumentLinkCache(async()=>{if(++calls===1)throw new Error('temporary');return {selector:'selector',secret:'secret'}})
 await assert.rejects(cache.url('en','https://preview.invalid'))
 assert.match(await cache.url('ru','https://preview.invalid'),/\/ru\/prescriptions\/selector#secret$/);assert.equal(calls,2)
})


test('Documents Ready uses compact cards with a primary cabinet action and three document actions', async () => {
  const [result, cabinet, actions, css] = await Promise.all([
    readFile('components/consultation-result.jsx', 'utf8'),
    readFile('components/cabinet-link-actions.jsx', 'utf8'),
    readFile('components/consultation-document-actions.jsx', 'utf8'),
    readFile('app/globals.css', 'utf8'),
  ])
  assert.match(result, /consultation-result-topbar/)
  assert.match(result, /consultation-document-card/)
  assert.match(cabinet, /consultation-cabinet-card/)
  assert.match(cabinet, /consultation-cabinet-primary/)
  assert.match(actions, /consultation-document-actions/)
  assert.match(actions, /consultation-action-primary/)
  assert.match(css, /Documents Ready — compact practitioner result screen/)
  assert.match(css, /\.consultation-result-documents[\s\S]*grid-template-columns: repeat\(2/)
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*\.consultation-result-documents[\s\S]*grid-template-columns: 1fr/)
})


test('Documents Ready compact mode hides secondary actions under More and uses dense mobile controls', async () => {
  const [result, cabinet, actions, css] = await Promise.all([
    readFile('components/consultation-result.jsx', 'utf8'),
    readFile('components/cabinet-link-actions.jsx', 'utf8'),
    readFile('components/consultation-document-actions.jsx', 'utf8'),
    readFile('app/globals.css', 'utf8'),
  ])
  assert.match(result, /consultation-result-topbar--dense/)
  assert.match(result, /consultation-result-summary--dense/)
  assert.match(result, /consultation-document-card--dense/)
  assert.match(cabinet, /consultation-cabinet-card--dense/)
  assert.match(cabinet, /Copy link/)
  assert.match(actions, /consultation-document-more/)
  assert.match(actions, />\{ru \? 'Ещё' : 'More'\}</)
  assert.match(css, /Documents Ready — single-screen mobile density/)
  assert.match(css, /consultation-cabinet-actions--dense[\s\S]*grid-template-columns: 1\.35fr 1fr 1fr/)
  assert.match(css, /consultation-document-actions > a[\s\S]*min-height: 36px/)
})
