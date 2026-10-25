import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {mountPractice} from './helpers/practice-quick-start-fixture.mjs'
import {TRADITION_COURSES} from '../lib/personal-coaching/traditions.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const workspace=read('components/app/practice-workspace.jsx')
const css=read('components/app/practice-dashboard.css')
const materials=read('components/app/practice-materials.jsx')
const materialCss=read('components/app/practice-materials.module.css')

test('a selected practice section replaces stacked screens instead of navigating to a second service page',()=>{
 assert.match(workspace,/data-practice-one-screen/)
 assert.match(workspace,/data-practice-active=\{activePanel\|\|undefined\}/)
 assert.match(workspace,/id="hh-practice-workspace-top"/)
 assert.match(workspace,/setActivePanel\(panel\)/)
 assert.doesNotMatch(workspace,/if\(!needsOnboarding&&activePanel==='services'\)return/)
 assert.match(workspace,/activePanel==='services'&&<div id="hh-practice-services-view"/)
 assert.match(workspace,/activePanel==='analytics'&&<div id="hh-practice-v4-analytics"/)
 assert.match(workspace,/activePanel==='more'&&<div/)
 assert.match(workspace,/!activePanel&&<div className="hh-practice-v4-requests"/)
 assert.match(workspace,/!activePanel&&<div id="hh-practice-v4-analytics"/)
 assert.match(workspace,/!activePanel&&<details className="hh-practice-v4-community"/)
 assert.match(workspace,/ownerTools && !activePanel && <details className="hh-practice-more-tools"/)
})

test('eight persistent tool shortcuts include two distinct Materials/Courses openings and a More drawer',()=>{
 for(const name of ['clients','requests','services','analytics','profile','more']){
  assert.ok(workspace.includes("choosePanel('"+name+"')"),name)
 }
 assert.match(workspace,/openMaterialsPanel\('articles'\)/)
 assert.match(workspace,/openMaterialsPanel\('courses'\)/)
 assert.match(workspace,/materialShortcut,setMaterialShortcut/)
 assert.match(workspace,/shortcut=\{materialShortcut\} onTabChange=\{setMaterialTab\}/)
 assert.match(workspace,/onClick=\{closePanel\}/)
 assert.match(workspace,/setPanelRoute\('materials',tab\)/)
 // Merged #1662 adds an optional Pro quick-create prop between existing callbacks.
 for(const prop of ['onSaveSitePresentation','quickCreateCourse=false','shortcut=null','onTabChange']) assert.ok(materials.includes(prop),prop)
 assert.match(materials,/\[shortcut\?\.nonce,shortcut\?\.tab,isOwner\]/)
 assert.match(materials,/onTabChange\?\.\(next\)/)
 assert.match(materials,/data-unified-material-nav/)
})

test('responsive work area fits eight 44px+ shortcuts across 320 to 430 pixels',()=>{
 assert.match(css,/V4\.3 · One workspace at a time/)
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/)
 assert.match(css,/grid-template-columns:repeat\(8,minmax\(0,1fr\)\)/)
 assert.match(css,/min-height:46px/)
 assert.match(css,/@media\(max-width:430px\)/)
 assert.match(css,/@media\(max-width:350px\)/)
 assert.match(css,/\[data-practice-detail-panel="materials"\]/)
 assert.match(css,/safe-area-inset-bottom/)
})

test('Video retains moderated save and authorization while rare private actions stay collapsed',()=>{
 assert.match(materials,/onSaveVideos=|onSaveSitePresentation/) // Existing callbacks, no replacement storage
 assert.match(materials,/onSubmitVideos/)
 assert.match(materials,/data-practice-video-advanced/)
 assert.match(materials,/reportMode!=='not-owner'/)
 assert.match(materials,/PracticeReportMaterials items=\{reportItems\}/)
 assert.match(materialCss,/\.advancedOptions/)
 assert.match(workspace,/fetch\('\/api\/app\/practitioner\/open'/)
 assert.match(workspace,/if\(busy\|\|!isOwner\)return/)
 assert.doesNotMatch(workspace,/service_role|SUPABASE_SERVICE_ROLE_KEY/)
})

for(const locale of ['en','ru','es']) test(`${locale}: Materials shortcuts switch the same panel and quick-create passes through without writing`,async()=>{
 const changes=[]
 const f=mountPractice(materials,{locale,accountId:'fictional-account',onTabChange:tab=>changes.push(tab)})
 await f.settle()
 assert.equal(f.find('div',p=>p.role==='tabpanel').props['data-material-panel'],'articles')
 f.update({shortcut:{nonce:1,tab:'courses'}})
 assert.equal(f.find('div',p=>p.role==='tabpanel').props['data-material-panel'],'courses')
 assert.equal(f.nodes().filter(n=>n.type==='course-builder').length,0)
 f.update({quickCreateCourse:true})
 const child=f.find('course-builder').props
 assert.equal(child.startCreate,true)
 assert.equal(child.locale,locale)
 assert.equal(child.accountId,'fictional-account')
 assert.equal(child.onOpenYoutube,null,'Non-owner must not receive owner upload action')
 f.update({shortcut:{nonce:2,tab:'articles'}})
 assert.equal(f.find('div',p=>p.role==='tabpanel').props['data-material-panel'],'articles')
 assert.equal(f.nodes().filter(n=>n.type==='course-builder').length,0,'Shortcut dismisses composer')
 f.update({shortcut:{nonce:3,tab:'audio'}})
 assert.equal(f.find('div',p=>p.role==='tabpanel').props['data-material-panel'],'articles','Owner-only audio cannot be opened')
 f.find('button',p=>p['data-practice-materials-courses-tab']!==undefined).props.onClick();f.flush()
 assert.equal(changes.at(-1),'courses')
 assert.equal(f.urls.at(-1),'/en/app/practice?materialTab=courses')
 assert.equal(f.requests.length,1)
 assert.equal(f.requests[0].url,'/api/app/practice/report-materials','Navigation must not create a course')
 f.unmount()
})

test('Materials shortcut rejects unknown tabs and permits owner audio only in the same workspace',async()=>{
 const f=mountPractice(materials,{isOwner:true})
 await f.settle()
 f.update({shortcut:{nonce:1,tab:'unknown'}})
 assert.equal(f.find('div',p=>p.role==='tabpanel').props['data-material-panel'],'courses')
 f.update({shortcut:{nonce:2,tab:'audio'}})
 assert.equal(f.find('div',p=>p.role==='tabpanel').props['data-material-panel'],'audio')
 assert.equal(f.requests.length,1)
 f.unmount()
})

test('synthetic Materials fixture rejects unknown lazy imports and missing JSX exports',()=>{
 const unknownImport=materials.replace("from '@/lib/personal-coaching/traditions.js'","from '@/lib/personal-coaching/unexpected-traditions.js'")
 assert.notEqual(unknownImport,materials)
 assert.throws(()=>mountPractice(unknownImport),/Unexpected import: @\/lib\/personal-coaching\/unexpected-traditions\.js/)
 const changedLoader=materials.replace("import('./compact-video-composer')","import('./unexpected-component')")
 assert.notEqual(changedLoader,materials)
 assert.throws(()=>mountPractice(changedLoader),/Unexpected dynamic loader/)
 const missingIcon=materials.replaceAll('BookOpen','MissingFixtureIcon')
 assert.notEqual(missingIcon,materials)
 assert.throws(()=>mountPractice(missingIcon,{isOwner:true}),/Undefined or unsupported JSX component/)
})

test('Materials fixture uses real public coaching metadata and retains owner-only audio folders',async()=>{
 const folders=f=>f.nodes().filter(node=>typeof node.type==='function'&&node.type.name==='CoachingAudioFolders')
 const f=mountPractice(materials,{isOwner:true,locale:'es'})
 await f.settle()
 assert.equal(folders(f).length,1)
 assert.deepEqual(folders(f)[0].props.courses,TRADITION_COURSES)
 assert.equal(folders(f)[0].props.locale,'es')
 f.update({shortcut:{nonce:1,tab:'audio'}})
 assert.deepEqual(folders(f)[0].props.courses,TRADITION_COURSES)
 f.update({isOwner:false,shortcut:{nonce:2,tab:'courses'}})
 assert.equal(folders(f).length,0,'Non-owner must not receive owner audio folders')
 assert.equal(f.requests.length,1,'Public course metadata must not initiate network reads or writes')
 assert.equal(f.requests[0].url,'/api/app/practice/report-materials')
 assert.equal(f.requests[0].options.method,undefined)
 f.unmount()
})
