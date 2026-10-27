import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {getServiceEditorIssue,servicePreviewPrice} from '../lib/practitioners/service-editor-steps.mjs'
import {validateServiceDraft} from '../lib/practitioners/contracts.js'
import {getHobbyServiceQuota} from '../lib/practitioners/service-quota.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const editor=read('components/app/simple-service-editor.jsx')
const editorCss=read('components/app/simple-service-editor.module.css')
const dashboard=read('components/app/my-services-dashboard.jsx')
const dashboardCss=read('components/app/my-services-dashboard.module.css')
const workspace=read('components/app/practice-workspace.jsx')
const photo=read('components/app/practice-photo-upload.jsx')
const videoField=read('components/app/practice-video-field.jsx')
const make=(patch={})=>({
 copy:{en:{title:'Private online session',shortDescription:'A clear, one-to-one introduction.'},ru:{},es:{}},
 areaKey:'personal_development',offeringType:'session',deliveryFormat:'online',locationLabel:'',
 languages:['en'],pricingMode:'contact',confirmedPrice:null,currency:'',durationMinutes:null,
 photos:[],imagePath:'',goals:[],methods:[],benefits:[],faq:[],displayLocales:['en','ru'],
 whatsapp:'',telegram:'',...patch
})

test('three visual blocks are edited in the existing practice service form, not a second backend',()=>{
 for(const block of ['presentation','booking','details'])assert.match(editor,new RegExp('data-service-slide="'+block+'"'))
 assert.match(editor,/data-service-visual-canvas/)
 assert.match(editor,/data-service-stage-nav/)
 assert.match(editor,/data-service-step-controls/)
 assert.match(editor,/data-service-save-actions/)
 assert.match(editor,/stage===0&&<section/)
 assert.match(editor,/stage===1&&<section/)
 assert.match(editor,/stage===2&&<section/)
 assert.match(editor,/onSave\(item\?\.id\|\|null,makePayload\(\),item\?\.revision\)/)
 assert.match(editor,/onSaveAndSubmit\(item\?\.id\|\|null,makePayload\(\),item\?\.revision\)/)
 assert.match(workspace,/action:'submit',expectedRevision:saved\.revision/)
 assert.match(workspace,/renderEditor=\{\(item,onDirtyChange,onMediaBusyChange\)=>/)
 assert.doesNotMatch(editor,/fetch\('\/api|onClick=\{.*sendLead/)
})

test('public client CTA is a labeled visual preview until existing moderation, not a fake lead',()=>{
 assert.match(editor,/c\.previewCtaNote/)
 assert.match(editor,/className=\{styles\.previewCta\}/)
 assert.match(editor,/c\.review/)
 assert.match(editor,/onPause\(item\)/)
 assert.doesNotMatch(editor,/<a[^>]*href=\{.*previewCta/)
 assert.match(dashboard,/data-status=\{item\.status\}/)
 assert.match(workspace,/quota=\{serviceQuota\}/)
 assert.equal(getHobbyServiceQuota(Array(10).fill({status:'draft'})).canAdd,false)
})

test('the real photo uploader is used in the first card and blocks save during media upload',()=>{
 assert.match(editor,/<PracticePhotoUpload mode="service" value=\{photos\}/)
 assert.match(editor,/onBusyChange=\{value=>\{setPhotoBusy\(value\);onMediaBusyChange\?\.\(value\)\}\}/)
 assert.match(editor,/const locked=busy\|\|videoBusy\|\|photoBusy/)
 assert.match(editor,/onChange=\{value=>set\('photos',value\)\}/)
 assert.match(editor,/photo\?<img src=\{photo\}/)
 assert.match(photo,/fetch\('\/api\/app\/practice\/photos'/)
 assert.match(photo,/Public only after approval/)
 assert.match(editor,/data-service-photo-tools/)
 const fields=editor.match(/<PracticeVideoField\b[\s\S]*?\/>/g)||[]
 assert.equal(fields.length,1)
 assert.match(fields[0],/introductions=\{draft\.serviceIntroductions\|\|\[\]\}/)
 assert.match(fields[0],/onIntroductionsChange=\{value=>set\('serviceIntroductions',value\)\}/)
 assert.match(fields[0],/onBusyChange=\{value=>\{setVideoBusy\(value\);onMediaBusyChange\?\.\(value\)\}\}/)
 assert.match(videoField,/import ServiceIntroductionEditor from '\.\/service-introduction-editor'/)
 assert.match(videoField,/if\(Array\.isArray\(props\.introductions\)\)\s*return <ServiceIntroductionEditor locale=\{props\.locale\} value=\{props\.introductions\}\s+onChange=\{props\.onIntroductionsChange\} onBusyChange=\{props\.onBusyChange\}\/>/)
 assert.match(editor,/onBusyChange=\{value=>\{setVideoBusy\(value\);onMediaBusyChange\?\.\(value\)\}\}/)
})

test('actual service draft initialization preserves localized introductions and migrates legacy video once',()=>{
 // Execute only the actual pure declarations before the React component. The
 // component/provider imports, uploader, hooks and server repository never run.
 const start=editor.indexOf('const BASE = {')
 const end=editor.indexOf('export default function ',start)
 assert.ok(start>=0&&end>start)
 assert.equal(editor.indexOf('const BASE = {',start+1),-1)
 const source=editor.slice(start,end)
 assert.match(source,/function initialDraft\(item,locale,starter=''\)/)
 assert.doesNotMatch(source,/\b(?:import|require|fetch|process)\b/)
 const initialize=(item,locale)=>JSON.parse(runInNewContext(
  source+'\nJSON.stringify(initialDraft(JSON.parse(input),locale))',
  {input:JSON.stringify(item),locale},{timeout:1000}))
 const legacy={kind:'external',url:'https://www.youtube.com/watch?v=abcdefghijk'}
 for(const locale of ['en','ru','es']){
  const draft=initialize({videoPresentation:legacy,languages:['de',locale]},'en')
  assert.deepEqual(draft.serviceIntroductions,[{language:locale,type:'video',media:legacy}])
  assert.equal(draft.videoPresentation,null)
  const fallback=initialize({draftCopy:{videoPresentation:legacy,languages:['de']}},locale)
  assert.deepEqual(fallback.serviceIntroductions,[{language:locale,type:'video',media:legacy}])
  assert.equal(fallback.videoPresentation,null)
  const fresh=initialize(null,locale)
  assert.deepEqual(fresh.serviceIntroductions,[])
  assert.equal(fresh.videoPresentation,null)
 }
 const introductions=[{language:'ru',type:'video',media:legacy}]
 for(const item of [
  {serviceIntroductions:introductions,videoPresentation:legacy},
  {draftCopy:{serviceIntroductions:introductions,videoPresentation:legacy}},
 ]){
  const draft=initialize(item,'en')
  assert.deepEqual(draft.serviceIntroductions,introductions)
  assert.equal(draft.videoPresentation,null)
 }
 // An explicitly cleared draft array wins over any stale legacy field.
 const cleared=initialize({draftCopy:{serviceIntroductions:[],videoPresentation:legacy}},'en')
 assert.deepEqual(cleared.serviceIntroductions,[])
 assert.equal(cleared.videoPresentation,null)
})

test('wizard input validation respects partial drafts, existing one-language submit and constraints',()=>{
 assert.equal(getServiceEditorIssue(make(),{complete:false}),null)
 assert.equal(getServiceEditorIssue(make(),{complete:true}),null)
 assert.equal(validateServiceDraft(make(),{complete:true}).copy.en.title,'Private online session')
 assert.deepEqual(getServiceEditorIssue(make({copy:{en:{title:'Only title'}}}),{complete:true}),{step:0,code:'needBasics'})
 assert.deepEqual(getServiceEditorIssue(make({pricingMode:'fixed',confirmedPrice:null,currency:'EUR'})),{step:1,code:'needPrice'})
 assert.deepEqual(getServiceEditorIssue(make({pricingMode:'from',confirmedPrice:100,currency:'EUR'})),null)
 assert.deepEqual(getServiceEditorIssue(make({durationMinutes:0})),{step:1,code:'needDuration'})
 assert.deepEqual(getServiceEditorIssue(make({deliveryFormat:'hybrid',locationLabel:''}),{complete:true}),{step:1,code:'needLocation'})
 assert.deepEqual(getServiceEditorIssue(make({languages:[]}),{complete:true}),{step:2,code:'needLanguages'})
 assert.deepEqual(getServiceEditorIssue(make({copy:{en:{title:'Service',shortDescription:'Example'},es:{title:'Solo'}}})),{step:0,code:'needSpanish'})
 assert.deepEqual(getServiceEditorIssue(make({whatsapp:'not-number'})),{step:2,code:'needContact'})
 assert.equal(servicePreviewPrice(make({pricingMode:'free'}),{free:'Free'}),'Free')
 assert.equal(servicePreviewPrice(make({pricingMode:'from',confirmedPrice:50,currency:'EUR'}),{from:'From'}),'From 50 EUR')
 assert.ok(editor.includes("draft.durationMinutes==null||draft.durationMinutes===''?null:Number(draft.durationMinutes)"))
})

test('the mobile editor is a calm client-facing page with photo left on desktop and no whole-page x-scroll',()=>{
 assert.match(editorCss,/\.serviceCanvas\{display:grid;grid-template-columns:minmax\(155px,.81fr\)/)
 assert.match(editorCss,/\.stageTabs\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/)
 assert.match(editorCss,/\.formatTiles\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/)
 assert.match(editorCss,/@media\(max-width:650px\)/)
 assert.match(editorCss,/@media\(max-width:355px\)/)
 assert.match(editorCss,/safe-area-inset-bottom/)
 assert.match(editorCss,/min-height:47px/)
 assert.match(dashboardCss,/\.editor\[data-service-composer-focus\]/)
 assert.match(dashboard,/\{!composing&&<div className=\{styles.stats\}/)
 assert.match(dashboard,/\{creating&&canAdd&&<div className=\{styles.editor\} data-service-composer-focus>/)
 assert.match(dashboard,/if\(creating&&createDirty&&!window\.confirm\(c\.discard\)\)return/)
 assert.match(dashboard,/renderEditor\(null,setCreateDirty,setMediaBusy\)/)
 assert.match(dashboard,/data-edit-service=\{editingItem\.id\}/)
 assert.match(dashboard,/renderEditor\(editingItem,setEditDirty,setMediaBusy\)/)
 assert.match(dashboard,/if\(editDirty&&!window\.confirm\(c\.discard\)\)return/)
 assert.match(dashboard,/if\(busy\|\|mediaBusy\)return/)
 assert.match(workspace,/key=\{item\?item\.id\+':'\+item\.revision:'new'\}/)
})

test('English/Russian/Spanish labels and hard server moderation remain the only publishing route',()=>{
 for(const lang of ['en','ru','es']){
  assert.match(editor,new RegExp('Object\\.assign\\(TEXT\\.'+lang+',\\{'))
 }
 assert.match(editor,/onDirtyChange\?\.\(true\)/)
 const route=read('lib/practitioners/repository.js')
 assert.match(route,/async saveService\(actor,id,input\)/)
 assert.match(route,/async submitService\(actor,id,input\)/)
 assert.match(route,/assertOwnedMarketingPhotos/)
 assert.match(route,/ensureHobbyServiceSlot/)
 assert.match(editor,/makePayload\(\),item\?\.revision/)
})
