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

test('public photo references require description, brand origin and direct media URL',() => {
  const allowed=normalizePostFields(fields({mediaUrl:'/images/poster.webp',mediaAlt:'An open book on a table'}))
  assert.equal(allowed.mediaUrl,'https://holistichouse.vercel.app/images/poster.webp')
  assert.equal(allowed.mediaAlt,'An open book on a table')
  assert.throws(()=>normalizePostFields(fields({mediaUrl:'/images/poster.jpg',mediaAlt:''})),/invalid_post/)
  assert.throws(()=>normalizePostFields(fields({mediaUrl:'https://evil.example/private.jpg',mediaAlt:'Poster'})),/invalid_post/)
  assert.throws(()=>normalizePostFields(fields({mediaUrl:'/en/client/portrait.jpg',mediaAlt:'Private'})),/invalid_post/)
  assert.throws(()=>normalizePostFields(fields({mediaUrl:'/images/poster.jpg?token=private',mediaAlt:'Poster'})),/invalid_post/)
  const video=normalizePostFields(fields({mediaUrl:'/assets/intro.mp4'}))
  assert.match(video.mediaUrl,/\.mp4$/)
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


test('all private client, assessment, profile, report and payment URL families are forbidden in public campaigns', () => {
  const privatePaths = [
    '/en/test-results/secret', '/ru/tests/assessment-42', '/es/test/123',
    '/en/assessment/finished', '/en/assessments/3',
    '/ru/results/portrait', '/en/report/123', '/en/my-reports',
    '/en/profile/account', '/en/settings/security', '/ru/dashboard',
    '/en/documents/secret', '/en/document-preview/secret',
    '/en/payments/checkout', '/en/payment/receipt', '/en/invoices/id',
    '/en/checkout/123', '/en/client-cabinet', '/en/my-tests',
    '/en/register', '/en/signup', '/en/logout', '/en/auth/callback',
    '/en/services/andy/reports/file.jpg',
  ];
  for (const pathname of privatePaths) {
    assert.throws(() => normalizePublicSource(pathname, 'holistic_house'), /invalid_post/, pathname)
    assert.throws(() => normalizePostFields(fields({sourceUrl: pathname})), /invalid_post/, pathname)
  }
  for (const pathname of [
    '/en/test-results/private.jpg', '/ru/profile/avatar.webp',
    '/en/document-preview/report.png', '/en/payments/receipt.mp4',
  ]) {
    assert.throws(() => normalizePostFields(fields({mediaUrl: pathname, mediaAlt:'A photo'})), /invalid_post/, pathname)
  }
  for (const [pathname,brand] of [
    ['/en/services/free-situation-review','holistic_house'],
    ['/en/academy/reiki/yggdrasil','holistic_house'],
    ['/en/events/love-magic-tarot-initiations-2026-10-25','holistic_house'],
    ['/en/toronto','holistic_house'],
    ['/events','toronto_tantra'],
    ['/','psitrends'],
  ]) {
    assert.doesNotThrow(() => normalizePublicSource(pathname,brand), pathname+' is public')
  }
})

test('production-like synthetic Redis REST adapter enforces namespace, CAS, retries and no real network', async () => {
  const values = new Map()
  const requestLog = []
  const environment = {
    PRESCRIPTIONS_KV_REST_API_URL:'https://synthetic-redis.example',
    PRESCRIPTIONS_KV_REST_API_TOKEN:'synthetic-test-token',
  }
  const fetchFn = async (url,opts) => {
    assert.equal(url, environment.PRESCRIPTIONS_KV_REST_API_URL)
    assert.equal(opts.method,'POST')
    assert.equal(opts.redirect,'error')
    assert.equal(opts.credentials,'omit')
    assert.equal(opts.cache,'no-store')
    assert.equal(opts.headers.Authorization,'Bearer '+environment.PRESCRIPTIONS_KV_REST_API_TOKEN)
    const command = JSON.parse(opts.body)
    requestLog.push(command)
    const [op, ...args] = command
    if (op==='HGET') return {ok:true,json:async()=>({result:values.get(args[1])??null})}
    if (op==='HGETALL') return {ok:true,json:async()=>({result:[...values].flat()})}
    if (op==='EVAL') {
      const [script, count, key, marker, ...rest] = args
      assert.equal(count,1)
      assert.equal(key,'holistic-house:growth-studio:editorial:v1')
      assert.ok(typeof script === 'string' && script.includes('redis.call'))
      if (typeof marker === 'number') {
        // Bulk command uses MAX_RECORDS as first argument after the key.
        const pairs=rest
        if(pairs.some((_,i)=>i%2===0&&values.has(pairs[i])))return {ok:true,json:async()=>({result:0})}
        for(let i=0;i<pairs.length;i+=2)values.set(pairs[i],pairs[i+1])
        return {ok:true,json:async()=>({result:1})}
      }
      const [expected, serialized] = rest
      const previous=values.get(marker)
      if ((previous && JSON.parse(previous).revision!==expected)||(!previous&&expected!==0))
        return {ok:true,json:async()=>({result:0})}
      values.set(marker,serialized)
      return {ok:true,json:async()=>({result:1})}
    }
    throw new Error('UNEXPECTED_REDIS_COMMAND')
  }
  const store=createGrowthStudioStore({environment,fetchFn})
  assert.ok(store)
  const first=nextGrowthPost({fields:fields(),action:'save',id:postId(),now:fixedNow})
  await store.save(first,0)
  assert.equal((await store.get(first.id)).title,first.title)
  const approved=nextGrowthPost({current:first,action:'approve',now:fixedNow})
  await store.save(approved,1)
  await assert.rejects(store.save(approved,1),/conflict/)
  const additional=nextGrowthPost({fields:fields({title:'Another public draft'}),action:'save',id:postId(),now:fixedNow})
  await store.batchCreate([additional])
  await assert.rejects(store.batchCreate([additional]),/conflict/)
  assert.deepEqual((await store.list()).map(x=>x.id).sort(),[first.id,additional.id].sort())
  assert.ok(requestLog.every(cmd=>cmd.includes('holistic-house:growth-studio:editorial:v1')))
  assert.ok(requestLog.every(cmd=>!cmd.includes('app.crm_contacts')&&!cmd.includes('client')&&!cmd.includes('prescriptions')))
})

test('Redis connection errors fail closed and never create browser fallback records', async () => {
  const environment={
    PRESCRIPTIONS_KV_REST_API_URL:'https://synthetic-redis.example',
    PRESCRIPTIONS_KV_REST_API_TOKEN:'synthetic-token',
  }
  const store=createGrowthStudioStore({environment,fetchFn:async()=>({ok:false,status:401})})
  await assert.rejects(store.list(),/storage_unavailable/)
  const malformed=createGrowthStudioStore({environment,fetchFn:async()=>({ok:true,json:async()=>({result:null})})})
  await assert.rejects(malformed.list(),/storage_unavailable/)
})
