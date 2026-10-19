import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {
  GrowthStudioError, normalizePostFields, normalizePublicSource, nextGrowthPost,
  publicCampaignLink, isSavedGrowthPost,
} from '../lib/growth-studio/model.mjs'
import {createMemoryGrowthStudioStore,createGrowthStudioStore} from '../lib/growth-studio/store.js'

const postId = () => randomUUID()
const fields = (overrides={}) => ({
  brand:'holistic_house', channel:'instagram', locale:'en',
  title:'Free introductory practices', caption:'Learn about our free introductory practices.',
  sourceUrl:'/en/academy', campaign:'intro_202610', scheduledAt:'2027-02-01T17:00:00.000Z', ...overrides,
})
const fixedNow = new Date('2027-01-20T12:00:00.000Z')

test('draft, approval, manual calendar plan, reopen and archive are explicit states only', async () => {
  const store = createMemoryGrowthStudioStore()
  const id = postId()
  const draft = nextGrowthPost({fields:fields(),action:'save',id,now:fixedNow})
  assert.equal(draft.status,'draft')
  await store.save(draft,0)
  const approved = nextGrowthPost({current:draft,action:'approve',now:fixedNow})
  await store.save(approved,1)
  const planned = nextGrowthPost({current:approved,action:'plan',now:fixedNow})
  await store.save(planned,2)
  assert.equal(planned.status,'planned_manual')
  assert.equal(planned.revision,3)
  assert.equal((await store.list())[0].status,'planned_manual')
  assert.equal((await store.get(id)).id,id)
  const reopened = nextGrowthPost({current:planned,action:'reopen',now:fixedNow})
  await store.save(reopened,3)
  const archived = nextGrowthPost({current:reopened,action:'archive',now:fixedNow})
  await store.save(archived,4)
  assert.equal(archived.status,'archived')
  assert.equal(await store.get(id).then(x=>x.revision),5)
})

test('concurrent/stale writes cannot overwrite a newer approval or plan',async () => {
  const store=createMemoryGrowthStudioStore()
  const id=postId()
  const draft=nextGrowthPost({fields:fields(),action:'save',id,now:fixedNow})
  await store.save(draft,0)
  const changed=nextGrowthPost({fields:fields({caption:'New draft'}),current:draft,action:'save',id,now:fixedNow})
  await store.save(changed,1)
  const stale=nextGrowthPost({current:draft,action:'approve',now:fixedNow})
  await assert.rejects(store.save(stale,1),/conflict/)
  assert.equal((await store.get(id)).caption,'New draft')
})

test('editing approved or planned copy always resets explicit approval',() => {
  const id=postId()
  const draft=nextGrowthPost({fields:fields(),action:'save',id,now:fixedNow})
  const approved=nextGrowthPost({current:draft,action:'approve',now:fixedNow})
  const edited=nextGrowthPost({current:approved,fields:fields({caption:'Updated'}),action:'save',id,now:fixedNow})
  assert.equal(edited.status,'draft')
  assert.throws(()=>nextGrowthPost({current:edited,action:'plan',now:fixedNow}),/invalid_transition/)
})

test('cannot approve blank caption or plan a past/unapproved post',() => {
  const id=postId()
  const draft=nextGrowthPost({fields:fields({caption:''}),action:'save',id,now:fixedNow})
  assert.throws(()=>nextGrowthPost({current:draft,action:'approve',now:fixedNow}),/invalid_transition/)
  const regular=nextGrowthPost({fields:fields(),action:'save',id:postId(),now:fixedNow})
  assert.throws(()=>nextGrowthPost({current:regular,action:'plan',now:fixedNow}),/invalid_transition/)
  const near=nextGrowthPost({fields:fields({scheduledAt:'2027-01-20T12:00:00.000Z'}),action:'save',id:postId(),now:fixedNow})
  const approved=nextGrowthPost({current:near,action:'approve',now:fixedNow})
  assert.throws(()=>nextGrowthPost({current:approved,action:'plan',now:fixedNow}),/invalid_transition/)
})

test('private URLs, off-brand destinations, query data and encoded private routes are forbidden',() => {
  for (const url of [
    'https://evil.example/en','http://holistichouse.vercel.app/','//evil.example',
    '/en/client','/en/app/practice','/api/admin','/en/%63lient/report',
    '/en/%2563lient/report','/en/%252fadmin','/en/%2fadmin',
    '/en/academy?client=123','https://holistichouse.vercel.app/en/academy#private',
  ]) assert.throws(()=>normalizePublicSource(url,'holistic_house'),/invalid_post/,url)
  assert.equal(normalizePublicSource('/en/services','holistic_house'),'https://holistichouse.vercel.app/en/services')
})

test('generated campaign links include only safe public campaign metadata',() => {
  const link=publicCampaignLink(fields())
  assert.match(link,/utm_source=instagram/)
  assert.match(link,/utm_campaign=intro_202610/)
  assert.match(link,/utm_content=en/)
  assert.equal(new URL(link).pathname,'/en/academy')
  assert.throws(()=>normalizePostFields(fields({campaign:'email@private.example'})),/invalid_post/)
  assert.throws(()=>normalizePostFields({...fields(),clientId:'secret'}),/invalid_post/)
})

test('closed fields and records reject status spoofing/unknown payloads',() => {
  assert.throws(()=>normalizePostFields({...fields(),status:'published'}),/invalid_post/)
  assert.throws(()=>normalizePostFields(fields({channel:'social-hack'})),/invalid_post/)
  assert.throws(()=>normalizePostFields(fields({caption:'a'.repeat(3501)})),/invalid_post/)
  const item=nextGrowthPost({fields:fields(),action:'save',id:postId(),now:fixedNow})
  assert.equal(isSavedGrowthPost(item),true)
  assert.equal(isSavedGrowthPost({...item,status:'published'}),false)
})

test('no server Redis configuration means no persistent studio, without local fallback',() => {
  assert.equal(createGrowthStudioStore({environment:{}}),null)
})

test('owner-only server actions, server route and no external dispatcher in first slice',() => {
  const action=readFileSync(new URL('../app/admin/growth-studio/actions.js',import.meta.url),'utf8')
  const page=readFileSync(new URL('../app/admin/growth-studio/page.js',import.meta.url),'utf8')
  assert.match(action,/requireAdminRequest\(\)/)
  assert.match(page,/requireAdminRequest\(\)/)
  assert.doesNotMatch(action,/fetch\(|sendMessage|publishPost|createScheduledPost/)
  assert.match(page,/storageReady/)
})
