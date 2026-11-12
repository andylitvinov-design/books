import test from 'node:test'
import assert from 'node:assert/strict'
import {reportPreviewRows} from '../lib/personal-coaching/report-preview.mjs'
import {makeReportSaveIntent} from '../lib/personal-coaching/report-save-intent.mjs'
import {buildCoachingReportV2Draft} from '../lib/personal-coaching/report-v2.js'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {createRequire} from 'node:module'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import ts from 'typescript'
import {randomUUID} from 'node:crypto'

test('preview projects only evidence-backed populated fields and actual action statuses',()=>{
 const report=buildCoachingReportV2Draft({session:{id:'test',status:'completed',answers:{goal:'Rest more',action:'Take a walk'},reflections:{}},questions:[{id:'goal',stepKey:'goal'},{id:'action',stepKey:'action'}]})
 const view=reportPreviewRows(report,'en')
 assert.equal(view.sections.length,10)
 assert.equal(view.sections.find(x=>x.key==='desiredOutcome').text,'Rest more')
 assert.equal(view.sections.find(x=>x.key==='actionPlan').status,'captured')
 assert.equal(view.sections.find(x=>x.key==='mainObstacles').status,'not_captured')
 assert.deepEqual(view.actions.map(x=>x.status),['draft'])
 assert.equal(view.actions.length,1)
})
test('preview rejects unknown schemas and never invents an empty report or candidate',()=>{
 assert.throws(()=>reportPreviewRows({schemaVersion:'unknown'},'en'),/COACHING_REPORT_VERSION_INVALID/)
 const report=buildCoachingReportV2Draft({session:{id:'test',status:'completed',answers:{},reflections:{}},questions:[]})
 const view=reportPreviewRows(report,'ru')
 assert.equal(view.sections.length,10)
 assert.ok(view.sections.every(section=>section.text==='В этой сессии не зафиксировано' || section.key==='actionPlan'))
 assert.deepEqual(view.actions,[])
})

test('private preview starts closed and identifies itself as an unsaved draft in EN and RU',()=>{
 const source=readFileSync(new URL('../components/coaching-report-preview.jsx',import.meta.url),'utf8')
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText
 const req=createRequire(import.meta.url)
 const modules={'next/link':'a',react:React,'react/jsx-runtime':req('react/jsx-runtime'),
  '@/lib/app/client-fetch':{appFetch:async()=>{throw Error('not called during render')}},
  '@/lib/personal-coaching/report-preview.mjs':{reportPreviewRows},'@/lib/personal-coaching/report-save-intent.mjs':{makeReportSaveIntent},'./coaching-report-preview.module.css':{}}
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
 const modules={'next/link':'a',react:React,'react/jsx-runtime':req('react/jsx-runtime'),'@/lib/app/client-fetch':{appFetch:async()=>{}},'@/lib/personal-coaching/report-preview.mjs':{reportPreviewRows},'@/lib/personal-coaching/report-save-intent.mjs':{makeReportSaveIntent},'./coaching-report-preview.module.css':{}}
 runInNewContext(output,{exports,require:name=>{if(Object.hasOwn(modules,name))return modules[name];throw Error(name)}})
 const rows={sections:[{key:'focus',label:'Your focus',text:'<script>alert(1)</script>'}],actions:[{id:'one',text:'Walk',statusLabel:'For review'},{id:'two',text:'Rest',statusLabel:'Previously confirmed'}]}
 const html=renderToStaticMarkup(React.createElement(exports.CoachingReportPreviewResult,{rows,locale:'en'}))
 assert.match(html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
 assert.doesNotMatch(html,/<script>/)
 assert.match(html,/For review/)
 assert.match(html,/Previously confirmed/)
})

test('a lost save response keeps the reviewed request locked and retry reuses its operation id',async()=>{
 const sid='20000000-0000-4000-8000-000000000001'
 const report=buildCoachingReportV2Draft({session:{id:sid,status:'completed',answers:{goal:'Rest more',action:'Take a walk'},reflections:{}},questions:[{id:'goal',stepKey:'goal'},{id:'action',stepKey:'action'}],sourceRevision:7})
 const requests=[],hooks=[];let cursor=0,nextFailure=null
 const react={useRef(value){const i=cursor++;return hooks[i]??(hooks[i]={current:value})},useState(value){const i=cursor++;if(!(i in hooks))hooks[i]=value;return [hooks[i],next=>{hooks[i]=typeof next==='function'?next(hooks[i]):next}]},useEffect(){cursor++}}
 const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})}
 const modules={'next/link':'a',react,'react/jsx-runtime':jsx,'@/lib/app/client-fetch':{appFetch:async(path,body,method)=>{if(path==='personal-coaching-report')return {revision:7,report};if(method==='GET')return {reports:[{id:'30000000-0000-4000-8000-000000000001',sessionId:sid,createdAt:'2026-11-09T20:00:00Z',report}]};if(path.endsWith('/delete')){requests.push({delete:body});return {deleted:true}}if(nextFailure){const error=Object.assign(new Error(nextFailure),{code:nextFailure});nextFailure=null;throw error}requests.push(structuredClone(body));if(requests.length===1)throw Error('lost response');return {saved:true,id:'30000000-0000-4000-8000-000000000001',revision:1}}},'@/lib/personal-coaching/report-preview.mjs':{reportPreviewRows},'@/lib/personal-coaching/report-save-intent.mjs':{makeReportSaveIntent},'./coaching-report-preview.module.css':{}}
 const source=readFileSync(new URL('../components/coaching-report-preview.jsx',import.meta.url),'utf8')
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText
 const exports={};runInNewContext(output,{exports,require:name=>modules[name],AbortController,crypto:{randomUUID}})
 const render=()=>{cursor=0;return exports.default({accountId:'10000000-0000-4000-8000-000000000001',sessionId:sid,revision:7,locale:'en'})}
 const nodes=(node,type)=>{if(!node||typeof node!=='object')return [];return [...(node.type===type?[node]:[]),...[node.props?.children].flat(Infinity).flatMap(child=>nodes(child,type))]}
 let tree=render();await nodes(tree,'button')[0].props.onClick()
 tree=render();nodes(tree,'select')[0].props.onChange({target:{value:'accepted'}})
 tree=render();nodes(tree,'input')[0].props.onChange({target:{checked:true}})
 tree=render();await nodes(tree,'button')[1].props.onClick()
 tree=render();assert.equal(nodes(tree,'select')[0].props.disabled,true);assert.equal(nodes(tree,'input')[0].props.disabled,true)
 assert.match(JSON.stringify(tree),/Retry saving/)
 await nodes(tree,'button')[1].props.onClick()
 assert.deepEqual(requests[1],requests[0]);assert.equal(requests[0].decisions[0].status,'accepted')
 tree=render();assert.match(JSON.stringify(tree),/Your reviewed report is saved/)
 const button=(tree,label)=>nodes(tree,'button').find(node=>node.props.children===label)
 await button(tree,'View saved report').props.onClick()
 tree=render();assert.match(JSON.stringify(tree),/Delete saved report/)
 assert.equal(button(tree,'Delete saved report').props.disabled,true)
 nodes(tree,'input')[0].props.onChange({target:{checked:true}})
 tree=render();await button(tree,'Delete saved report').props.onClick()
 assert.equal(requests.at(-1).delete.confirmed,true)
 assert.deepEqual(Object.keys(requests.at(-1).delete),['confirmed'])
 tree=render();assert.match(JSON.stringify(tree),/Saved report deleted/)
 // A fresh page that discovers an existing report must not start a conflicting save.
 hooks.length=0;tree=render();await button(tree,'View saved report').props.onClick()
 tree=render();await button(tree,'Preview report').props.onClick()
 tree=render();nodes(tree,'select')[0].props.onChange({target:{value:'accepted'}})
 tree=render();nodes(tree,'input').find(node=>node.props.onChange&&!node.props.disabled).props.onChange({target:{checked:true}})
 tree=render();assert.equal(button(tree,'Save report').props.disabled,true)
 for(const code of ['COACHING_REPORT_SOURCE_UNVERSIONED','PERSONAL_COACH_REVISION_CONFLICT']){
  hooks.length=0;tree=render();await button(tree,'Preview report').props.onClick()
  tree=render();nodes(tree,'select')[0].props.onChange({target:{value:'accepted'}})
  tree=render();nodes(tree,'input')[0].props.onChange({target:{checked:true}})
  nextFailure=code;tree=render();await button(tree,'Save report').props.onClick();tree=render()
  if(code==='COACHING_REPORT_SOURCE_UNVERSIONED'){
   assert.match(JSON.stringify(tree),/older session can be previewed/)
   assert.equal(button(tree,'Save report').props.disabled,true)
  }else{
   assert.match(JSON.stringify(tree),/session changed/)
   assert.equal(button(tree,'Save report'),undefined)
  }
 }
})

test('archive remains available without a session and removes only the selected report after confirmation',async()=>{
 const ids=['20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002']
 const records=ids.map((sessionId,i)=>({id:`30000000-0000-4000-8000-00000000000${i+1}`,sessionId,createdAt:'2026-11-09T20:00:00Z',report:buildCoachingReportV2Draft({session:{id:sessionId,status:'completed',answers:{goal:`Goal ${i+1}`},reflections:{}},questions:[{id:'goal',stepKey:'goal'}],sourceRevision:7})}))
 const calls=[],hooks=[];let cursor=0
 const react={useRef(value){const i=cursor++;return hooks[i]??(hooks[i]={current:value})},useState(value){const i=cursor++;if(!(i in hooks))hooks[i]=value;return [hooks[i],next=>{hooks[i]=typeof next==='function'?next(hooks[i]):next}]},useEffect(){cursor++}}
 const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})}
 const modules={'next/link':'a',react,'react/jsx-runtime':jsx,'@/lib/app/client-fetch':{appFetch:async(path,body,method)=>{calls.push({path,body,method});return method==='GET'?{reports:records}:{deleted:true}}},'@/lib/personal-coaching/report-preview.mjs':{reportPreviewRows},'@/lib/personal-coaching/report-save-intent.mjs':{makeReportSaveIntent},'./coaching-report-preview.module.css':{}}
 const source=readFileSync(new URL('../components/coaching-report-preview.jsx',import.meta.url),'utf8')
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText
 const exports={};runInNewContext(output,{exports,require:name=>modules[name],AbortController,crypto:{randomUUID}})
 let currentAccount='10000000-0000-4000-8000-000000000001'
 const render=()=>{cursor=0;return exports.default({accountId:currentAccount,archiveOnly:true,locale:'en'})}
 const nodes=(node,type)=>{if(!node||typeof node!=='object')return [];return [...(node.type===type?[node]:[]),...[node.props?.children].flat(Infinity).flatMap(child=>nodes(child,type))]}
 const button=(tree,label)=>nodes(tree,'button').find(node=>node.props.children===label)
 let tree=render();await button(tree,'View saved reports').props.onClick()
 currentAccount='10000000-0000-4000-8000-000000000002'
 tree=render();assert.equal(nodes(tree,'select').length,0,'old archive must not render during an account change')
 currentAccount='10000000-0000-4000-8000-000000000001'
 tree=render();nodes(tree,'select')[0].props.onChange({target:{value:records[1].id}})
 tree=render();assert.equal(button(tree,'Delete saved report').props.disabled,true)
 nodes(tree,'input')[0].props.onChange({target:{checked:true}})
 tree=render();await button(tree,'Delete saved report').props.onClick()
 assert.equal(calls.at(-1).path,`personal-coaching-reports/${records[1].id}/delete`)
 assert.equal(calls.at(-1).body.confirmed,true)
 tree=render();assert.equal(nodes(tree,'select')[0].props.children.length,1)
 const page=readFileSync(new URL('../components/app/personal-coaching.jsx',import.meta.url),'utf8')
 assert.match(page,/<CoachingReportPreview\s+accountId=\{accountId\}\s+archiveOnly/)
})

test('session deletion confirmation explains that saved reports remain separately',()=>{
 const source=readFileSync(new URL('../components/app/personal-coaching.jsx',import.meta.url),'utf8')
 assert.match(source,/deleteConfirm:'[^']*Saved reports remain[^']*'/)
 assert.match(source,/deleteConfirm:'[^']*Сохранённые отчёты останутся[^']*'/)
 assert.match(source,/deleteConfirm:'[^']*Los informes guardados permanecerán[^']*'/)
})
