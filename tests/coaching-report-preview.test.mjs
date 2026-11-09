import test from 'node:test'
import assert from 'node:assert/strict'
import {reportPreviewRows} from '../lib/personal-coaching/report-preview.mjs'
import {buildCoachingReportV2Draft} from '../lib/personal-coaching/report-v2.js'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {createRequire} from 'node:module'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import ts from 'typescript'

test('preview projects only evidence-backed populated fields and actual action statuses',()=>{
 const report=buildCoachingReportV2Draft({session:{id:'test',status:'completed',answers:{goal:'Rest more',action:'Take a walk'},reflections:{}},questions:[{id:'goal',stepKey:'goal'},{id:'action',stepKey:'action'}]})
 const view=reportPreviewRows(report,'en')
 assert.deepEqual(view.sections.map(x=>x.text),['Rest more','Rest more'])
 assert.deepEqual(view.actions.map(x=>x.status),['draft'])
 assert.equal(view.actions.length,1)
})
test('preview rejects unknown schemas and never invents an empty report or candidate',()=>{
 assert.throws(()=>reportPreviewRows({schemaVersion:'unknown'},'en'),/COACHING_REPORT_VERSION_INVALID/)
 const report=buildCoachingReportV2Draft({session:{id:'test',status:'completed',answers:{},reflections:{}},questions:[]})
 const view=reportPreviewRows(report,'ru')
 assert.deepEqual(view.sections,[])
 assert.deepEqual(view.actions,[])
})

test('private preview starts closed and identifies itself as an unsaved draft in EN and RU',()=>{
 const source=readFileSync(new URL('../components/coaching-report-preview.jsx',import.meta.url),'utf8')
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText
 const req=createRequire(import.meta.url)
 const modules={react:React,'react/jsx-runtime':req('react/jsx-runtime'),
  '@/lib/app/client-fetch':{appFetch:async()=>{throw Error('not called during render')}},
  '@/lib/personal-coaching/report-preview.mjs':{reportPreviewRows},'./coaching-report-preview.module.css':{}}
 const exports={}
 runInNewContext(output,{exports,require:name=>{if(Object.hasOwn(modules,name))return modules[name];throw Error(name)}})
 const en=renderToStaticMarkup(React.createElement(exports.default,{locale:'en',accountId:'a',sessionId:'s',revision:1}))
 const ru=renderToStaticMarkup(React.createElement(exports.default,{locale:'ru',accountId:'a',sessionId:'s',revision:1}))
 assert.match(en,/Preview report/)
 assert.match(en,/not saved as a report/i)
 assert.match(ru,/Предпросмотр отчёта/)
 assert.doesNotMatch(en,/data-report-result/)
})

test('rendered report escapes client text and distinguishes unconfirmed from confirmed actions',()=>{
 const source=readFileSync(new URL('../components/coaching-report-preview.jsx',import.meta.url),'utf8')
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText
 const req=createRequire(import.meta.url),exports={}
 const modules={react:React,'react/jsx-runtime':req('react/jsx-runtime'),'@/lib/app/client-fetch':{appFetch:async()=>{}},'@/lib/personal-coaching/report-preview.mjs':{reportPreviewRows},'./coaching-report-preview.module.css':{}}
 runInNewContext(output,{exports,require:name=>{if(Object.hasOwn(modules,name))return modules[name];throw Error(name)}})
 const rows={sections:[{key:'focus',label:'Your focus',text:'<script>alert(1)</script>'}],actions:[{id:'one',text:'Walk',statusLabel:'For review'},{id:'two',text:'Rest',statusLabel:'Previously confirmed'}]}
 const html=renderToStaticMarkup(React.createElement(exports.CoachingReportPreviewResult,{rows,locale:'en'}))
 assert.match(html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
 assert.doesNotMatch(html,/<script>/)
 assert.match(html,/For review/)
 assert.match(html,/Previously confirmed/)
})
