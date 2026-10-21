import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  GEMINI_MODEL,MISTRAL_DIRECT_MODEL,MISTRAL_STUDIO_ALIAS,modelSettings,freeMistral,chooseFreeMistral,publicReviewPrompt,
  reviewGemini,reviewMistral,reviewDailyCouncil,composeDailyCouncilTelegram
} from '../lib/practitioners/council-free-models.mjs'
import {pickPublicCouncilReports,readCouncilEvidence} from '../lib/practitioners/council-telegram-archive.mjs'

const SITE='https://holistichouse.vercel.app'
const report={
  date:'2026-10-20',url:'https://github.com/andylitvinov-design/ai-projects-brain/issues/242#issuecomment-77',
  markdown:'# Holistic House — ежедневные анализы и техническое задание\n\n## Статус рецензентов\nNo models in source.\n## Приоритизированное ТЗ\nTechnical HTML-only plan'+'\nPublic HTML evidence and route-specific tests. '.repeat(8),
  evidence:{source:SITE,date_toronto:'2026-10-20',pages:[
    {url:SITE+'/en/services',status:200,title:'Services',lang:'en',flags:['missing_description'],
      public_text_excerpt:'Public services HTML meta observed'},
    {url:'https://outside.example/private',status:200,title:'UNTRUSTED EXTERNAL'},
    {url:SITE+'/en/client/private',status:200,title:'PRIVATE SECRET'}
  ]}
}
const long='Реальный технический анализ: '+('Проверить страницу и указать точный URL и критерий приёмки. ').repeat(8)
const json=(data,status=200)=>Response.json(data,{status})
const noNet=async()=>{throw Error('Network MUST NOT be invoked')}

test('missing keys cannot call external inference or invent Gemini or Mistral',async()=>{
  const result=await reviewDailyCouncil(report,{},noNet)
  assert.equal(result.gemini.status,'unavailable')
  assert.equal(result.mistral.status,'unavailable')
  const final=composeDailyCouncilTelegram(report,result)
  assert.match(final.markdown,/Реальных независимых модельных ответов: 0\/2/)
  assert.match(final.markdown,/Это НЕ ответ модели/)
  assert.equal(final.models.length,0)
})
test('Gemini requires explicitly confirmed Free Tier and correct stable ID',async()=>{
  const r=await reviewGemini(report,{HH_COUNCIL_GEMINI_API_KEY:'test-key'},noNet)
  assert.equal(r.status,'disabled')
  assert.equal(r.reason,'FREE_TIER_NOT_CONFIRMED')
  assert.equal(GEMINI_MODEL,'gemini-3.8-flash')
})
test('confirmed Free Tier Gemini produces one genuine attributed complete response',async()=>{
  const env={HH_COUNCIL_GEMINI_API_KEY:'synthetic-key',
    HH_COUNCIL_GEMINI_FREE_TIER_CONFIRMED:'true'}
  let calls=0
  const value=await reviewGemini(report,env,async(url,options)=>{
    calls++
    assert.ok(url.endsWith('/models/gemini-3.8-flash:generateContent'))
    assert.equal(options.headers['x-goog-api-key'],env.HH_COUNCIL_GEMINI_API_KEY)
    const body=JSON.parse(options.body)
    assert.equal(body.generationConfig.thinkingConfig.thinkingLevel,'low')
    assert.ok(body.contents[0].parts[0].text.includes('missing_description'))
    assert.ok(!body.contents[0].parts[0].text.includes('PRIVATE SECRET'))
    assert.ok(!body.contents[0].parts[0].text.includes('UNTRUSTED EXTERNAL'))
    return json({candidates:[{finishReason:'STOP',content:{parts:[{text:long}]}}]})
  })
  assert.equal(calls,1)
  assert.equal(value.status,'ok')
  assert.equal(value.model,GEMINI_MODEL)
})
test('Gemini rejects quota and incomplete provider replies',async()=>{
  const env={HH_COUNCIL_GEMINI_API_KEY:'synthetic',HH_COUNCIL_GEMINI_FREE_TIER_CONFIRMED:'true'}
  const quota=await reviewGemini(report,env,async()=>json({},429))
  assert.equal(quota.status,'error')
  assert.equal(quota.reason,'HTTP 429')
  const clipped=await reviewGemini(report,env,async()=>json({
    candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:long}]}}]
  }))
  assert.equal(clipped.status,'error')
})
test('all OpenRouter catalog Mistral pricing fields must literally be zero',()=>{
  const free={id:'mistralai/mistral-small-3.2-24b-instruct:free',
    pricing:{prompt:'0',completion:'0',request:'0',image:'0'}}
  assert.equal(freeMistral(free),true)
  for(const item of [
    {...free,id:'other/mistral:free'},
    {...free,id:'mistralai/mistral-small-3.2-24b-instruct'},
    {...free,pricing:{prompt:'0',completion:'0.01'}},
    {...free,pricing:{prompt:'0'}},
    {...free,pricing:{prompt:'0',completion:'unknown'}}
  ])assert.equal(freeMistral(item),false)
  assert.equal(chooseFreeMistral([
    {id:'mistralai/mistral-7b-instruct:free',pricing:{prompt:'0',completion:'0'}},
    free
  ])?.id,free.id)
})
test('Mistral $0 catalog and per-request zero cap block paid fallback',async()=>{
  const env={HH_COUNCIL_OPENROUTER_API_KEY:'synthetic-openrouter-key'}
  const model='mistralai/mistral-small-3.2-24b-instruct:free'
  const sent=[]
  const result=await reviewMistral(report,env,async(url,options)=>{
    sent.push(String(url))
    if(String(url).endsWith('/models'))return json({data:[
      {id:'mistralai/paid',pricing:{prompt:'0.5',completion:'2'}},
      {id:model,pricing:{prompt:'0',completion:'0',request:'0'}}
    ]})
    const payload=JSON.parse(options.body)
    assert.equal(payload.model,model)
    assert.equal(options.headers.Authorization,'Bearer '+env.HH_COUNCIL_OPENROUTER_API_KEY)
    assert.deepEqual(payload.provider.max_price,{prompt:0,completion:0,request:0,image:0})
    assert.equal(payload.provider.allow_fallbacks,false)
    assert.deepEqual(payload.usage,{include:true})
    return json({model,usage:{cost:0},choices:[{finish_reason:'stop',message:{content:long}}]})
  })
  assert.equal(result.status,'ok')
  assert.equal(sent.length,2)
  assert.equal(result.model,model)
})
test('Mistral does not accept different model IDs or nonzero/unverified costs',async()=>{
  const env={HH_COUNCIL_OPENROUTER_API_KEY:'synthetic'}
  const model='mistralai/mistral-nemo:free'
  const data={model,usage:{cost:0},choices:[{finish_reason:'stop',message:{content:long}}]}
  for(const altered of [
    {...data,model:'other/paid-model'},
    {...data,usage:{cost:0.01}},
    {...data,usage:{}},
  ]){
    const response=await reviewMistral(report,env,async url=>
      String(url).endsWith('/models')
        ?json({data:[{id:model,pricing:{prompt:'0',completion:'0'}}]})
        :json(altered))
    assert.equal(response.status,'error')
  }
  const unavailable=await reviewMistral(report,env,async()=>json({data:[]}))
  assert.equal(unavailable.status,'unavailable')
})
test('archive JSON is reused only if full, date and source validated',()=>{
  const evidence=JSON.stringify(report.evidence)
  const fence=String.fromCharCode(96).repeat(3)
  const body='<!-- HH-COUNCIL-DAILY:2026-10-20 -->\n'+report.markdown+
    '\n<!-- HH-COUNCIL-EVIDENCE -->\n\n'+fence+'json\n'+evidence+'\n'+fence
  const comment={id:77,user:{login:'github-actions[bot]'},body,html_url:report.url}
  const picked=pickPublicCouncilReports([comment],{
    today:'2026-10-20',earliest:'2026-10-14'
  })
  assert.equal(picked.length,1)
  assert.equal(picked[0].evidence.pages.length,3)
  assert.equal(readCouncilEvidence(body,'2026-10-19'),null)
  assert.equal(readCouncilEvidence(body.replace(evidence,evidence.slice(0,60)),'2026-10-20'),null)
})
test('combined Telegram Markdown attributes only actual Gemini/Mistral answers',()=>{
  const result=composeDailyCouncilTelegram(report,{
    gemini:{model:'gemini-3.8-flash',status:'ok',reason:'',text:long},
    mistral:{model:'Mistral',status:'unavailable',reason:'OPENROUTER_KEY_MISSING'}
  })
  assert.equal(result.outcomes.gemini,'ok')
  assert.equal(result.outcomes.mistral,'unavailable')
  assert.equal(result.models.length,1)
  assert.equal(result.sources.some(x=>x.includes('real:gemini-3.8-flash')),true)
  assert.match(result.markdown,/Реальных независимых модельных ответов: 1\/2/)
  assert.match(result.markdown,/Приоритизированное ТЗ/)
})
test('daily report is cached under one claimed private date before Telegram send',()=>{
  const code=readFileSync(new URL('../lib/practitioners/council-telegram-delivery.js',import.meta.url),'utf8')
  assert.match(code,/report_markdown,model_outcomes/)
  assert.match(code,/report_markdown is null returning/)
  assert.match(code,/if\(!markdown\)/)
  assert.match(code,/reviewDailyCouncil\(report,env,fetcher\)/)
  assert.match(code,/composeDailyCouncilTelegram\(report,reviews\)/)
  assert.match(code,/One delivery per invocation/)
  assert.match(code,/status='failed'/)
  const sql=readFileSync(new URL('../supabase/migrations/20261020190745_hh_free_ai_council_cached_daily_20261020.sql',import.meta.url),'utf8')
  assert.match(sql,/force row level security/i)
  assert.match(sql,/revoke all.*from public,anon,authenticated/i)
  assert.doesNotMatch(sql,/API_KEY|BOT_TOKEN|client_email|phone/i)
})


test('Mistral Studio key is never used without owner-confirmed Free mode',async()=>{
  const env={HH_COUNCIL_MISTRAL_API_KEY:'synthetic-direct-mistral'}
  const settings=modelSettings(env)
  assert.equal(settings.mistralDirectKeyPresent,true)
  assert.equal(settings.mistralDirectFreeConfirmed,false)
  assert.equal(settings.mistralKeyPresent,false)
  const result=await reviewMistral(report,env,noNet)
  assert.equal(result.status,'disabled')
  assert.equal(result.reason,'FREE_MODE_NOT_CONFIRMED')
})
test('confirmed Mistral Studio Free mode checks accessible model before inference',async()=>{
  const env={HH_COUNCIL_MISTRAL_API_KEY:'synthetic-free-mode-key',
    HH_COUNCIL_MISTRAL_FREE_MODE_CONFIRMED:'true'}
  const calls=[]
  const result=await reviewMistral(report,env,async(url,options)=>{
    calls.push(String(url))
    assert.equal(options.headers.Authorization,'Bearer '+env.HH_COUNCIL_MISTRAL_API_KEY)
    if(String(url).endsWith('/models')){
      assert.equal(options.method,'GET')
      return json({data:[{id:MISTRAL_DIRECT_MODEL}]})
    }
    assert.equal(String(url),'https://api.mistral.ai/v1/chat/completions')
    assert.equal(options.method,'POST')
    const body=JSON.parse(options.body)
    assert.equal(body.model,MISTRAL_DIRECT_MODEL)
    assert.equal(body.stream,false)
    assert.match(body.messages[1].content,/missing_description/)
    assert.ok(!body.messages[1].content.includes('PRIVATE SECRET'))
    return json({model:MISTRAL_DIRECT_MODEL,
      choices:[{finish_reason:'stop',message:{content:long}}]})
  })
  assert.equal(modelSettings(env).mistralKeyPresent,true)
  assert.deepEqual(calls,[
    'https://api.mistral.ai/v1/models',
    'https://api.mistral.ai/v1/chat/completions'
  ])
  assert.equal(result.status,'ok')
  assert.equal(result.model,MISTRAL_DIRECT_MODEL)
  assert.ok(result.text.length>=180)
})
test('Mistral Studio Free mode fail-closed on inaccessible model, 429 and substitution',async()=>{
  const env={HH_COUNCIL_MISTRAL_API_KEY:'test-key',
    HH_COUNCIL_MISTRAL_FREE_MODE_CONFIRMED:'true',
    HH_COUNCIL_OPENROUTER_API_KEY:'test-openrouter'}
  let count=0
  const missing=await reviewMistral(report,env,async()=>{
    count++
    return json({data:[]})
  })
  assert.equal(missing.status,'unavailable')
  assert.equal(missing.reason,'MODEL_NOT_IN_WORKSPACE')
  assert.equal(count,1)
  const quota=await reviewMistral(report,env,async(url)=>
    String(url).endsWith('/models')
      ?json({data:[{id:MISTRAL_DIRECT_MODEL}]})
      :json({},429))
  assert.equal(quota.status,'error')
  assert.equal(quota.reason,'HTTP 429')
  const altered=await reviewMistral(report,env,async(url)=>
    String(url).endsWith('/models')
      ?json({data:[{id:MISTRAL_DIRECT_MODEL}]})
      :json({model:'not-mistral',choices:[{
        finish_reason:'stop',message:{content:long}
      }]}))
  assert.equal(altered.status,'error')
  assert.equal(altered.reason,'incomplete_or_short')
})


test('Mistral Studio Free mode supports the official Small latest alias',async()=>{
 const env={HH_COUNCIL_MISTRAL_API_KEY:'synthetic-api-key',
   HH_COUNCIL_MISTRAL_FREE_MODE_CONFIRMED:'true'}
 const model=MISTRAL_STUDIO_ALIAS
 const result=await reviewMistral(report,env,async(url,options)=>{
   if(String(url).endsWith('/models'))return json({data:[{id:model}]})
   const request=JSON.parse(options.body)
   assert.equal(request.model,model)
   return json({model:MISTRAL_DIRECT_MODEL,
     choices:[{finish_reason:'stop',message:{content:long}}]})
 })
 assert.equal(result.status,'ok')
 assert.equal(result.model,MISTRAL_DIRECT_MODEL)
})
