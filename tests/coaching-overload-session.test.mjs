import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('the first overload coaching session is one reviewed GROW scheme, not a duplicate coach app',()=>{
  const sql=read('supabase/migrations/20261108140500_hh_coaching_overload_session_v1.sql')
  assert.match(sql,/'grow_overload_20_v1','grow_v1'/)
  assert.match(sql,/"ru":"GROW · От перегрузки к ясному плану"/)
  assert.match(sql,/estimated_minutes,topic_tags,step_keys,required_custom_plan/)
  assert.match(sql,/ARRAY\['productivity','stress','goal','decision'\]/)
  assert.match(sql,/ARRAY\['pilot_start','goal','reality','priorities','options','will','pilot_end','review'\]/)
  assert.match(sql,/true,true\)/)
  assert.match(sql,/ON CONFLICT \(scheme_key\) DO NOTHING/)
  assert.match(sql,/ON CONFLICT \(question_key\) DO NOTHING/)
  assert.match(sql,/ON CONFLICT \(answer_set_key\) DO NOTHING/)
  assert.match(sql,/'priorities',7/)
  assert.match(sql,/'pilot_start',8/)
  assert.match(sql,/'pilot_end',9/)
  assert.match(sql,/'scale_0_10',NULL,true,false/)
  assert.match(sql,/grow_overload_clarity_start_q1_v1/)
  assert.match(sql,/grow_overload_clarity_end_q1_v1/)
  for(const locale of ['en','ru','es']){
    assert.match(sql,new RegExp('"'+locale+'":'))
  }
  assert.doesNotMatch(sql,/CREATE TABLE|CREATE POLICY|GRANT |INSERT INTO .*client|personal_coaching_sessions|openrouter|elevenlabs|stripe/i)
})

test('the prioritisation step is summarized as the current situation, not a chosen action',()=>{
  const source=read('lib/personal-coaching/guided-session.js')
  assert.match(source,/situationOrder=\[[^\]]*'priorities'/)
  assert.match(source,/actionOrder=\['first_step','plan','action','step','will','destiny'\]/)
})

test('recognized urgent text is not blocked by the pilot written-plan length hint',()=>{
  const source=read('components/app/personal-coaching.jsx')
  assert.match(source,/requiresWrittenPlan\s*&&\s*!isCoachingSafetyConcern\(answer\)/)
})

test('the prioritisation question may use one authored reality follow-up in the existing offline flow',()=>{
  const source=read('lib/personal-coaching/offline-intelligence.js')
  assert.match(source,/priorities:'reality'/)
  assert.match(source,/const prompts=Object\.freeze/)
  assert.match(source,/rows\.some\(row=>row\.stage===stage\)/)
})

test('private coaching routes suppress the global promotional ribbon, while public routes retain it',()=>{
  const require=createRequire(import.meta.url)
  const output=ts.transpileModule(read('components/sitewide-antistress-banner.tsx'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},
  }).outputText
  let pathname=''
  const empty=()=>null
  const modules={react:React,'react/jsx-runtime':require('react/jsx-runtime'),
    'next/link':({children})=>React.createElement('a',null,children),'next/image':empty,
    'next/navigation':{usePathname:()=>pathname},'lucide-react':{ArrowRight:empty,ChevronDown:empty,Sparkles:empty},
    '@/lib/public-card-artwork':{cardArtworkUrl:()=>''},'@/components/static-portrait':{StaticPortrait:empty},
    './sitewide-antistress-banner.module.css':{}}
  const exports={}
  runInNewContext(output,{exports,require:name=>{if(Object.hasOwn(modules,name))return modules[name];throw Error(name)}})
  for(const locale of ['en','ru','es']){
    for(const path of [`/${locale}/app/coaching`,`/${locale}/app/coaching/greek`]){
      pathname=path
      assert.equal(renderToStaticMarkup(React.createElement(exports.SitewideAntistressBanner,{initialLocale:locale})), '')
    }
    // The dedicated human coaching landing has its own compact header.
    pathname=`/${locale}/coaching`
    assert.equal(renderToStaticMarkup(React.createElement(exports.SitewideAntistressBanner,{initialLocale:locale})), '')
    // The self-guided session catalog remains a normal public discovery page.
    pathname=`/${locale}/coaching/sessions`
    assert.match(renderToStaticMarkup(React.createElement(exports.SitewideAntistressBanner,{initialLocale:locale})),/data-sitewide-personal-review-banner/)
  }
})
