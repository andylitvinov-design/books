import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  cleanGrowthSourceText,parsePublicGrowthHead,previewPublicGrowthSource,
} from '../lib/growth-studio/source-preview.mjs'

const url='/en/academy'
const main='https://holistichouse.vercel.app/en/academy'
const validHtml=String.raw`<!doctype html><html lang="en-CA"><head>
  <meta property="og:description" content="Explore &amp; learn with &quot;Holistic House&quot;.">
  <meta content="Holistic &amp; House — Academy" property="og:title">
  <meta name="robots" content="index,follow">
  <script>window.private_account_token="SHOULD_NOT_RETURN";</script>
  <title>Fallback title</title>
</head><body><p>PRIVATE_BODY_MUST_NOT_RETURN</p></body></html>`
const response=(html=validHtml,headers={})=>new Response(html,{status:200,headers:{'content-type':'text/html; charset=utf-8',...headers}})
const run=(input={brand:'holistic_house',sourceUrl:url},fetchFn=async()=>response())=>
  previewPublicGrowthSource(input,{fetchFn})

test('extracts public HTML head only, without scripts or body, and never auto-publishes',async()=>{
  let calls=0
  const result=await run(undefined,async(input,init)=>{
    calls++
    assert.equal(input,main)
    assert.equal(init.method,'GET')
    assert.equal(init.redirect,'manual')
    assert.equal(init.cache,'no-store')
    assert.equal(init.credentials,'omit')
    assert.equal(init.referrerPolicy,'no-referrer')
    assert.deepEqual(init.headers,{Accept:'text/html'})
    return response()
  })
  assert.equal(calls,1)
  assert.deepEqual(result,{
    sourceUrl:main,title:'Holistic & House — Academy',
    description:'Explore & learn with "Holistic House".',
    language:'en',requiresReview:true,
  })
  assert.doesNotMatch(JSON.stringify(result),/SHOULD_NOT_RETURN|PRIVATE_BODY_MUST_NOT_RETURN/)
  assert.equal(Object.hasOwn(result,'published'),false)
  assert.equal(Object.hasOwn(result,'mediaUrl'),false)
})

test('parses RU pages and HTML entities in title safely with human editorial review',()=>{
  const html='<html lang="ru"><head><meta name="description" content="Информация &mdash; для изучения."><title>Рэйки &amp; практики</title></head><body>x</body></html>'
  const result=parsePublicGrowthHead(html,'https://holistichouse.vercel.app/ru/academy')
  assert.equal(result.title,'Рэйки & практики')
  assert.equal(result.description,'Информация — для изучения.')
  assert.equal(result.language,'ru')
  assert.equal(result.requiresReview,true)
  assert.equal(cleanGrowthSourceText('&#x41;&#65;<script>trap</script>'),'AA trap')
})

test('rejects private/admin/test/foreign URLs before requesting network',async()=>{
  let calls=0
  const fake=async()=>{calls++;return response()}
  for(const bad of [
    '/admin/clients','/api/app/profile','/en/client','/en/app/report','/en/%63lient/data',
    '/en/academy?user=abc','https://evil.example/article','http://holistichouse.vercel.app/en/academy',
    'https://torontotantra.vercel.app/en/academy','//evil.example',
  ]){
    await assert.rejects(run({brand:'holistic_house',sourceUrl:bad},fake),/invalid_source/,bad)
  }
  await assert.rejects(run({brand:'unknown',sourceUrl:url},fake),/invalid_source/)
  await assert.rejects(run({brand:'holistic_house',sourceUrl:''},fake),/invalid_source/)
  await assert.rejects(run({brand:'holistic_house',sourceUrl:url,token:'private'},fake),/invalid_source/)
  assert.equal(calls,0)
})


test('never treats meta-like strings inside script/style/comment as publisher metadata',()=>{
  const page=String.raw`<html lang="ru"><head>
    <script>const bad = '<meta property="og:title" content="INJECTED_FAKE_TITLE">';</script>
    <!-- <meta property="og:description" content="INJECTED_FAKE_DESCRIPTION"> -->
    <style>/* <meta name="description" content="INJECTED_STYLES"> */</style>
    <title>Настоящее название</title>
  </head><body>not imported</body></html>`
  const data=parsePublicGrowthHead(page,'https://holistichouse.vercel.app/ru/academy')
  assert.equal(data.title,'Настоящее название')
  assert.equal(data.description,'')
  assert.doesNotMatch(JSON.stringify(data),/INJECTED_/)
})

test('does not follow redirects, auth challenges or upstream errors',async()=>{
  let count=0
  for(const status of [301,302,303,307,308,401,403,404,500]){
    await assert.rejects(run(undefined,async(_url,init)=>{
      count++
      assert.equal(init.redirect,'manual')
      return new Response('',{status,headers:{Location:'https://evil.example/secret','content-type':'text/html'}})
    }),/source_not_public/)
  }
  assert.equal(count,9)
})

test('rejects non-HTML and robots noindex documents',async()=>{
  await assert.rejects(run(undefined,async()=>new Response('{}',{headers:{'content-type':'application/json'}})),/source_not_html/)
  await assert.rejects(run(undefined,async()=>response(validHtml,{'x-robots-tag':'noindex, nofollow'})),/source_not_public/)
  await assert.rejects(run(undefined,async()=>response('<html><head><meta name="robots" content="noindex"><title>Secret</title></head></html>')),/source_not_public/)
})

test('does not allow empty metadata, private body fallback or malformed HTML',()=>{
  assert.throws(()=>parsePublicGrowthHead('<html><head></head><body><h1>Private content</h1></body></html>',main),/source_missing_metadata/)
  assert.throws(()=>parsePublicGrowthHead('<html><head><title>Closed but no end',main),/source_invalid_html/)
  assert.throws(()=>parsePublicGrowthHead('<script>just data</script>',main),/source_invalid_html/)
  assert.throws(()=>parsePublicGrowthHead('<html><head><meta name="robots" content="NOINDEX"><title>A</title></head></html>',main),/source_not_public/)
})

test('caps streamed HTML head size and aborts before processing giant private pages',async()=>{
  const oversized='<html><head>'+ 'A'.repeat(150000)+'</head><body>secret</body></html>'
  await assert.rejects(run(undefined,async()=>response(oversized)),/source_too_large/)
  await assert.rejects(run(undefined,async()=>({ok:true,status:200,headers:new Headers({'content-type':'text/html'}),body:null})),/source_unavailable/)
})

test('never leaks network failures, raw response or upstream server details to UI',async()=>{
  const error=new Error('internal db password=secret')
  await assert.rejects(run(undefined,async()=>{throw error}),e=>{
    assert.equal(e.code,'source_unavailable')
    assert.doesNotMatch(e.message,/password|secret/)
    return true
  })
})

test('server action is admin-gated and sends no metadata to provider or persistence by itself',()=>{
  const source=readFileSync(new URL('../app/admin/growth-studio/actions.js',import.meta.url),'utf8')
  assert.match(source,/previewPublicGrowthSourceAction/)
  assert.match(source,/requireAdminRequest\(\)/)
  assert.match(source,/previewPublicGrowthSource\(/)
  assert.doesNotMatch(source,/publishGrowth.*Source|autoPublish.*Source/i)
})
