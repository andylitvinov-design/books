import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'

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
 assert.match(materials,/onSaveSitePresentation,shortcut=null,onTabChange/)
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
