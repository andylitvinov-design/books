// Browser geometry of the actual numeric report SSR + production CSS.
// Every request is intercepted and fulfilled from synthetic in-memory HTML.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, webkit, expect } from '@playwright/test'
import { gaugeModel } from '../lib/assessments/dashboard-gauges.js'
import { assessmentResultOverview } from '../lib/assessments/result-overview.js'
import {
  reportMobileFixtureOrigin, reportMobileFixtureScope, reportMobileWidths,
  buildReportMobileRenderer, buildReportMobileFixtures, requireHostedReportMobile,
} from './helpers/assessment-range-mobile-fixture.mjs'

requireHostedReportMobile(process.env)
const browserName=process.env.HH_TEST_BROWSER
assert.ok(['chromium','webkit'].includes(browserName),'Browser must be explicit')
const engine=browserName==='webkit'?webkit:chromium
const output='artifacts/app-r1/assessment-range-mobile-'+browserName
await mkdir(output,{recursive:true})
const renderer=await buildReportMobileRenderer()
const fixtures=buildReportMobileFixtures()
const evidence={browser:browserName,commit:process.env.GITHUB_SHA,
  scope:reportMobileFixtureScope,sourceProof:renderer.sourceProof,
  expectedCases:fixtures.length*reportMobileWidths.length,cases:[],failure:null}
await writeFile(output+'/source-proof.json',JSON.stringify(evidence,null,2)+'\n')
const browser=await engine.launch()
evidence.browserVersion=await browser.version()
let activePage,activeCase
const sampleKeys=new Set(['cbi-personal','phq-9','hh-current-state','hh-socionics-32','cfpb-financial-wellbeing-5'])
const normal=t=>String(t).replace(/\s+/g,' ').trim()
try{
 for(const fixture of fixtures)for(const width of reportMobileWidths){
  const id=[fixture.key,fixture.instrumentLocale,fixture.locale,fixture.pattern,width].join('-')
  activeCase=id
  const path=output+'/'+id
  await mkdir(path,{recursive:true})
  const context=await browser.newContext({viewport:{width,height:844},isMobile:browserName==='chromium'&&width<600,
    hasTouch:browserName==='chromium'&&width<600,
    deviceScaleFactor:1,serviceWorkers:'block',reducedMotion:'reduce'})
  context.setDefaultTimeout(12000)
  const errors=[],blocked=[]
  const url=reportMobileFixtureOrigin+fixture.path
  const html=renderer.document(fixture)
  await context.route('**/*',route=>{
    const req=route.request()
    if(req.url()===url&&req.isNavigationRequest()&&req.method()==='GET'){
      return route.fulfill({contentType:'text/html',headers:{
        'Cache-Control':'no-store',
        'Content-Security-Policy':"default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'none'; connect-src 'none'; form-action 'none'; frame-src 'none'",
      },body:html})
    }
    blocked.push({method:req.method(),url:req.url()})
    return route.abort('blockedbyclient')
  })
  const page=await context.newPage()
  activePage=page
  page.on('pageerror',error=>errors.push(error.message))
  try{
   await page.goto(url,{waitUntil:'load'})
   const report=page.locator('[data-compact-assessment-report][data-personal-result-report]')
   await expect(report).toHaveCount(1)
   const section=fixture.report.sections[assessmentResultOverview(fixture.report,fixture.result,fixture.locale).initialIndex]
   const dimension=fixture.result.dimensions.find(d=>d.key===section.key)
   const model=gaugeModel(dimension,fixture.result,fixture.locale)
   assert.ok(model?.rangeReading,id+': missing verified model')
   const expected=model.rangeReading
   const panel=report.locator('article[data-active-scale]')
   await expect(panel).toHaveCount(1)
   await expect(panel).toHaveAttribute('data-active-scale',section.key)
   await expect(panel.locator('[data-assessment-gauge]')).toHaveCount(1)
   const visual=panel.locator('[data-assessment-range-report]')
   await expect(visual).toBeVisible()
   await expect(visual).toHaveAttribute('data-range-kind',expected.kind)
   const rows=visual.locator('[data-score-range]')
   await expect(rows).toHaveCount(expected.rows.length)
   const selected=visual.locator('[data-selected-score-range="true"]')
   await expect(selected).toHaveCount(1)
   await expect(selected).toHaveAttribute('data-score-range',expected.current.code)
   await expect(panel.locator('[data-current-score-range]')).toContainText(expected.current.label)
   await expect(visual.locator('[data-range-characterization]')).toContainText(expected.narrative)
   const rowCodes=await rows.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-score-range')))
   assert.deepEqual(rowCodes,expected.rows.map(r=>r.code),id+': exact range list order')
   for(const [index,row] of expected.rows.entries()){
    const item=rows.nth(index)
    await expect(item).toContainText(row.displayRange)
    await expect(item).toContainText(row.label)
   }
   if(expected.trait)await expect(visual.locator('[data-personality-scale-characterization]')).toBeVisible()
   const state=[]
   const capture=async name=>{
     const geometry=await page.evaluate(()=>{
       const root=document.querySelector('[data-compact-assessment-report]')
       const panel=root.querySelector('article[data-active-scale]')
       const report=panel.querySelector('[data-assessment-range-report]')
       const rect=node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}}
       const visible=node=>{const c=getComputedStyle(node),r=node.getBoundingClientRect()
         return c.display!=='none'&&c.visibility!=='hidden'&&r.width>0&&r.height>0&&
           !(node.closest('details:not([open])')&&!node.closest('summary'))}
       const labels=['[data-current-score-range]','[data-range-characterization]','[data-all-score-ranges]',
         '[data-range-evidence-status]','[data-score-range]', '[data-score-range-description]']
       const target=[root,panel,report,...panel.querySelectorAll(labels.join(','))].filter(visible)
       const elements=target.map(node=>({tag:node.tagName,cls:String(node.className).slice(0,80),
         text:node.textContent.trim().replace(/\s+/g,' ').slice(0,90),rect:rect(node),
         scrollWidth:node.scrollWidth,clientWidth:node.clientWidth,
         overflowX:getComputedStyle(node).overflowX}))
       const textFragments=[]
       const walker=document.createTreeWalker(report,NodeFilter.SHOW_TEXT)
       while(walker.nextNode()){
         const node=walker.currentNode
         if(!node.textContent.trim()||!visible(node.parentElement))continue
         const range=document.createRange()
         range.selectNodeContents(node)
         for(const fragment of range.getClientRects())if(fragment.width>0&&fragment.height>0)
           textFragments.push({text:node.textContent.trim().slice(0,80),
             left:fragment.left,right:fragment.right,
             parentLeft:node.parentElement.getBoundingClientRect().left,
             parentRight:node.parentElement.getBoundingClientRect().right})
       }
       return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,
         bodyWidth:document.body.scrollWidth,report:rect(report),panel:rect(panel),elements,textFragments}
     })
     const problems=[]
     if(geometry.documentWidth>geometry.viewport+1||geometry.bodyWidth>geometry.viewport+1)
       problems.push('document horizontal overflow '+geometry.documentWidth+'/'+geometry.viewport)
     const card=geometry.report
     for(const el of geometry.elements){
       if(el.rect.left < -1||el.rect.right>geometry.viewport+1)
         problems.push('range outside viewport: '+el.text)
       if(el.rect.left<geometry.panel.left-1||el.rect.right>geometry.panel.right+1)
         problems.push('range outside panel: '+el.text)
       if(el.scrollWidth>el.clientWidth+1&&el.overflowX!=='auto'&&el.overflowX!=='scroll')
         problems.push('range content clipped horizontally: '+el.text)
     }
     for(const fragment of geometry.textFragments){
       if(fragment.left<card.left-1||fragment.right>card.right+1)
         problems.push('text outside report: '+fragment.text)
       if(fragment.left<fragment.parentLeft-1||fragment.right>fragment.parentRight+1)
         problems.push('text fragment outside own line: '+fragment.text)
     }
     await writeFile(path+'/'+name+'-geometry.json',JSON.stringify({geometry,problems},null,2)+'\n')
     assert.deepEqual(problems,[],id+'/'+name+': responsive layout issue')
     state.push({name,viewport:geometry.viewport,documentWidth:geometry.documentWidth,
       textFragments:geometry.textFragments.length})
   }
   await capture('collapsed')
   if(sampleKeys.has(fixture.key)&&width===320&&fixture.locale===fixture.instrumentLocale){
     await visual.scrollIntoViewIfNeeded()
     await page.screenshot({path:path+'/selected-range.png',animations:'disabled'})
   }
   const explain=visual.locator('[data-score-range-descriptions]')
   if(expected.rows.length>1){
     await expect(explain).toHaveCount(1)
     await expect(explain).not.toHaveAttribute('open')
     const summary=explain.locator(':scope > summary')
     await summary.focus()
     await page.keyboard.press('Enter')
     await expect(explain).toHaveAttribute('open','')
     const details=explain.locator('[data-score-range-description]')
     await expect(details).toHaveCount(expected.rows.length)
     for(const row of expected.rows){
       await expect(explain.locator('[data-score-range-description="'+row.code+'"]')).toContainText(row.note)
     }
     await capture('expanded')
     if(sampleKeys.has(fixture.key)&&width===390&&fixture.locale===fixture.instrumentLocale){
       await visual.scrollIntoViewIfNeeded()
       await page.screenshot({path:path+'/all-range-explanations.png',animations:'disabled'})
     }
     await summary.focus()
     await page.keyboard.press('Space')
     await expect(explain).not.toHaveAttribute('open')
     await capture('collapsed-again')
   }
   assert.deepEqual(errors,[],id+': browser JS errors')
   assert.deepEqual(blocked,[],id+': unexpected external network request')
   evidence.cases.push({id,kind:expected.kind,selected:expected.current.code,
     totalRanges:expected.rows.length,states:state})
  }catch(error){
    evidence.failure={case:id,error:String(error),blocked,errors}
    await page.screenshot({path:path+'/failure.png',animations:'disabled'}).catch(()=>{})
    throw error
  }finally{await context.close();activePage=null}
 }
 assert.equal(evidence.cases.length,evidence.expectedCases,'All synthetic viewport states tested')
}finally{
 await writeFile(output+'/verification.json',JSON.stringify(evidence,null,2)+'\n')
 await browser.close()
}
