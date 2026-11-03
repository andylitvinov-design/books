import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  normalizeGrowthRadarUrl,parseGrowthRadarSitemap,scanGrowthPublicRadar,
  radarBatchId,createGrowthRadarDraft,
} from '../lib/growth-studio/content-radar.mjs'
import {createMemoryGrowthStudioStore} from '../lib/growth-studio/store.js'

const base='https://holistichouse.vercel.app'
const url=base+'/en/services/free-situation-review'
const second=base+'/en/academy/reiki/yggdrasil'
const russian=base+'/ru/academy/reiki/yggdrasil'
const es=base+'/es/events/future-public-workshop'
const xml=[
'<?xml version="1.0" encoding="UTF-8"?>',
'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
'<url><loc>'+second+'</loc><lastmod>2026-10-18T00:00:00.000Z</lastmod></url>',
'<url><loc>'+url+'</loc><lastmod>2026-10-19T00:00:00.000Z</lastmod></url>',
'<url><loc>'+russian+'</loc><lastmod>2026-10-18T00:00:00.000Z</lastmod></url>',
'<url><loc>'+es+'</loc><lastmod>2026-10-19T00:00:00.000Z</lastmod></url>',
'<url><loc>'+base+'/en/client/results/private</loc></url>',
'<url><loc>'+base+'/en/tests/stress/123</loc></url>',
'<url><loc>'+base+'/en/payments/checkout</loc></url>',
'<url><loc>'+base+'/en/events/future-public-workshop?client_id=abc</loc></url>',
'<url><loc>https://evil.example/en/services/free-situation-review</loc></url>',
'<url><loc>'+url+'</loc></url>',
'</urlset>',
].join('\n')
const head=[
'<!doctype html><html lang="en"><head>',
'<meta property="og:title" content="Free Personal Situation Review">',
'<meta property="og:description" content="Take a first step with a free written personal reflection.">',
'<meta name="robots" content="index,follow">',
'</head><body>PRIVATE CONTENT MUST NOT BE INCLUDED</body></html>',
].join('\n')
const sitemapResponse=(body=xml,headers={})=>
  new Response(body,{status:200,headers:{'content-type':'application/xml',...headers}})
const pageResponse=(body=head,headers={})=>
  new Response(body,{status:200,headers:{'content-type':'text/html; charset=utf-8',...headers}})
function fakeFetch({badSitemap=false,html=head}={}){
  const calls=[]
  const fetchFn=async (uri,options)=>{
    calls.push({uri,options})
    assert.equal(options.method,'GET')
    assert.equal(options.credentials,'omit')
    assert.equal(options.cache,'no-store')
    assert.equal(options.referrerPolicy,'no-referrer')
    if(uri===base+'/sitemap.xml'){
      if(badSitemap)return new Response('',{status:503})
      assert.equal(options.redirect,'error')
      return sitemapResponse()
    }
    assert.equal(uri,url)
    assert.equal(options.redirect,'manual')
    return pageResponse(html)
  }
  return {fetchFn,calls}
}

test('only selected public locale/category URLs survive sitemap scan, no private/foreign path',()=>{
  assert.equal(normalizeGrowthRadarUrl(url,'en'),url)
  for(const bad of [
    base+'/en/app/client',base+'/en/client/results',base+'/en/tests',
    base+'/en/payments/receipt',base+'/en/profile',base+'/admin/growth-studio',
    base+'/en/services/andy/secret',base+'/en/academy/../client',
    url+'?email=someone@example.org',url+'#private',
    base+'/en/%63lient/private',base+'/en/services//free-situation-review',
    'https://evil.example/en/services/free-situation-review',
  ])assert.throws(()=>normalizeGrowthRadarUrl(bad,'en'),/invalid_source/,bad)
  assert.throws(()=>normalizeGrowthRadarUrl(russian,'en'),/invalid_source/)
  assert.throws(()=>normalizeGrowthRadarUrl(url,'fr'),/invalid_source/)
  const rows=parseGrowthRadarSitemap(xml,{locale:'en',existingSourceUrls:[url]})
  assert.equal(rows.length,2)
  assert.equal(rows[0].sourceUrl,second)
  assert.equal(rows[1].sourceUrl,url)
  assert.equal(rows[0].hasDraft,false)
  assert.equal(rows[1].hasDraft,true)
  assert.ok(rows.every(x=>x.sourceUrl.startsWith(base+'/en/')))
  assert.deepEqual(parseGrowthRadarSitemap(xml,{locale:'ru'}).map(z=>z.sourceUrl),[russian])
  assert.deepEqual(parseGrowthRadarSitemap(xml,{locale:'es'}).map(z=>z.sourceUrl),[es])
})

test('bounded first-party sitemap fetch never reaches private services or follows redirects',async()=>{
  const {fetchFn,calls}=fakeFetch()
  const candidates=await scanGrowthPublicRadar({locale:'en'},{fetchFn})
  assert.equal(candidates.length,2)
  assert.equal(calls.length,1)
  assert.equal(calls[0].uri,base+'/sitemap.xml')
  assert.equal(calls[0].options.headers.Accept,'application/xml,text/xml')
  assert.equal(calls[0].options.redirect,'error')
  for(const body of ['private','<html>no sitemap</html>','<urlset><url>broken','a'.repeat(900000)])
    assert.throws(()=>parseGrowthRadarSitemap(body,{locale:'en'}),/radar_unavailable/)
  await assert.rejects(scanGrowthPublicRadar({locale:'en'},{
    fetchFn:fakeFetch({badSitemap:true}).fetchFn,
  }),/radar_unavailable/)
  await assert.rejects(scanGrowthPublicRadar({locale:'en'},{
    fetchFn:async()=>new Response('<html></html>',{headers:{'content-type':'text/html'}}),
  }),/radar_unavailable/)
  await assert.rejects(scanGrowthPublicRadar({locale:'invalid'},{fetchFn}),/invalid_source/)
})

test('deterministic ID produces one review draft across retries without external writes',async()=>{
  const store=createMemoryGrowthStudioStore()
  const {fetchFn,calls}=fakeFetch()
  const input={sourceUrl:url,locale:'en',channel:'manual'}
  const first=await createGrowthRadarDraft(input,{
    store,fetchFn,now:new Date('2026-10-20T15:00:00.000Z'),
  })
  assert.equal(first.reused,false)
  assert.equal(first.record.status,'draft')
  assert.equal(first.record.revision,1)
  assert.equal(first.record.sourceUrl,url)
  assert.equal(first.record.title,'Free Personal Situation Review')
  assert.equal(first.record.caption,'Take a first step with a free written personal reflection.')
  assert.equal(first.record.channel,'manual')
  assert.equal(first.record.mediaUrl,'')
  assert.equal(first.record.scheduledAt,'')
  assert.equal(first.record.campaign,'hh_content_radar')
  assert.equal(Object.hasOwn(first.record,'delivery'),false)
  assert.equal(Object.hasOwn(first.record,'attemptId'),false)
  assert.equal(calls.length,2)
  assert.equal(calls[1].uri,url)
  const again=await createGrowthRadarDraft(input,{
    store,fetchFn,now:new Date('2026-10-20T16:00:00.000Z'),
  })
  assert.equal(again.reused,true)
  assert.equal(again.record.id,first.record.id)
  assert.equal((await store.list()).length,1)
  assert.equal(radarBatchId(url,'manual'),radarBatchId(url,'manual'))
  assert.notEqual(radarBatchId(url,'manual'),radarBatchId(url,'facebook'))
})

test('new channel creates a separate unapproved draft without inferred posting rights',async()=>{
  const store=createMemoryGrowthStudioStore()
  const {fetchFn}=fakeFetch()
  const saved=await createGrowthRadarDraft({
    sourceUrl:url,locale:'en',channel:'facebook',
  },{store,fetchFn})
  assert.equal(saved.record.status,'draft')
  assert.equal(saved.record.channel,'facebook')
  assert.equal(Object.hasOwn(saved.record,'published'),false)
  assert.equal(Object.hasOwn(saved.record,'providerId'),false)
})

test('invalid path, channel, noindex and missing sitemap cannot create records',async()=>{
  const store=createMemoryGrowthStudioStore()
  assert.deepEqual(await store.list(),[])
  for(const input of [
    {sourceUrl:base+'/en/client/reports',locale:'en',channel:'manual'},
    {sourceUrl:url+'?answer=private',locale:'en',channel:'manual'},
    {sourceUrl:url,locale:'en',channel:'unapproved_app'},
    {sourceUrl:url,locale:'ru',channel:'manual'},
  ])await assert.rejects(createGrowthRadarDraft(input,{
    store,fetchFn:fakeFetch().fetchFn,
  }),/invalid_source/)
  const noindex=head.replace('content="index,follow"','content="noindex,nofollow"')
  await assert.rejects(createGrowthRadarDraft({
    sourceUrl:url,locale:'en',channel:'manual',
  },{store,fetchFn:fakeFetch({html:noindex}).fetchFn}),/source_not_public/)
  await assert.rejects(createGrowthRadarDraft({
    sourceUrl:url,locale:'en',channel:'manual',
  },{store,fetchFn:fakeFetch({badSitemap:true}).fetchFn}),/radar_unavailable/)
  assert.deepEqual(await store.list(),[])
})

test('owner-only UI/server actions require consent; no credentials or provider writes',()=>{
  const actions=readFileSync(new URL('../app/admin/growth-studio/content-radar/actions.js',import.meta.url),'utf8')
  const page=readFileSync(new URL('../app/admin/growth-studio/content-radar/page.js',import.meta.url),'utf8')
  const ui=readFileSync(new URL('../components/growth-studio-content-radar.jsx',import.meta.url),'utf8')
  const model=readFileSync(new URL('../lib/growth-studio/content-radar.mjs',import.meta.url),'utf8')
  const picker=readFileSync(new URL('../components/growth-studio-source-picker.jsx',import.meta.url),'utf8')
  assert.match(page,/requireAdminRequest\(\)/)
  assert.match(page,/redirect\('\/admin\/login'\)/)
  assert.match(page,/robots:\{index:false,follow:false\}/)
  for(const name of ['scanGrowthRadarAction','createGrowthRadarDraftAction']){
    const start=actions.indexOf('export async function '+name)
    assert.ok(start>=0)
    assert.match(actions.slice(start,start+200),/requireAdminRequest\(\)/)
  }
  assert.match(actions,/input\.confirmed!==true/)
  assert.match(actions,/await store\.list\(\)/)
  assert.match(actions,/createGrowthRadarDraft\(input,\{store\}\)/)
  assert.match(ui,/window\.confirm\(ui\.confirm\)/)
  assert.match(ui,/onClick=\{scan\}/)
  assert.match(picker,/href="\/admin\/growth-studio\/content-radar"/)
  assert.match(model,/prepareGrowthBulk\(/)
  assert.doesNotMatch(model,/sendTelegramPost\(|publishGrowthTelegramNowAction|createAd|sendBeacon|localStorage|cookies\(/)
  assert.doesNotMatch(actions,/sendTelegramPost\(|publishGrowthTelegramNowAction|createAd|user_data|GA_MEASUREMENT/)
  assert.doesNotMatch(ui,/PRESCRIPTIONS_KV_REST_API_TOKEN|HH_GROWTH_TELEGRAM_BOT_TOKEN|accessToken/)
})
