// Synthetic visual acceptance of actual protected ClientCabinet JSX; no private accounts.
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFile,mkdir,writeFile} from 'node:fs/promises'
import {runInNewContext} from 'node:vm'
import {fileURLToPath} from 'node:url'
import React from 'react'
import * as jsx from 'react/jsx-runtime'
import {renderToStaticMarkup} from 'react-dom/server'
import ts from 'typescript'
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import {chromium,webkit} from '@playwright/test'

const browserName=process.env.HH_TEST_BROWSER
assert.ok(['chromium','webkit'].includes(browserName))
const root=new URL('../',import.meta.url)
const read=path=>readFile(new URL(path,root),'utf8')
const files=['components/client-cabinet.jsx','app/[locale]/client/[selector]/cabinet-modern.css',
  'app/globals.css','tailwind.config.ts']
const [component,modernCss,globalCss,tailwindConfig]=await Promise.all(files.map(read))
assert.match(component,/data-private-client-cabinet="true"/)
assert.match(modernCss,/\.client-cabinet\.client-cabinet--modern/)
assert.match(tailwindConfig,/content/)
const stylesheet=await postcss([tailwindcss({config:fileURLToPath(new URL(files[3],root))}),
  autoprefixer()]).process(globalCss,{from:fileURLToPath(new URL(files[2],root))})
assert.deepEqual(stylesheet.warnings().map(w=>w.toString()),[])
const css=stylesheet.css+'\n'+modernCss

const Icon=({size=18})=>React.createElement('svg',{'aria-hidden':'true',width:size,height:size,viewBox:'0 0 20 20'},
  React.createElement('circle',{cx:10,cy:10,r:6,stroke:'currentColor',fill:'none'}))
const Link=({href,children,prefetch,...props})=>React.createElement('a',{href,...props},children)
const placeholder=(label,attribute)=>()=>React.createElement('section',{[attribute]:true},label)
const imports={
  react:React,'react/jsx-runtime':jsx,
  'lucide-react':{FileText:Icon,ReceiptText:Icon,Sparkles:Icon,UserRound:Icon},
  'next/link':{__esModule:true,default:Link},
  './app/personal-analysis-panel':{PersonalAnalysisPanel:placeholder('Synthetic analysis','data-synthetic-analysis')},
  './app/profile-domains':{ProfileDomains:placeholder('Synthetic profile','data-synthetic-profile')},
  './client-assessments':{ClientAssessments:placeholder('Synthetic assessments','data-synthetic-assessments')},
  '@/lib/whatsapp-enquiry':{whatsappEnquiryUrl:()=> 'https://example.invalid/support'},
}
const transformed=ts.transpileModule(component,{
  fileName:files[0],compilerOptions:{jsx:ts.JsxEmit.ReactJSX,
    module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},
  reportDiagnostics:true,
})
assert.deepEqual((transformed.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error),[])
const m={exports:{}}
runInNewContext(transformed.outputText,{module:m,exports:m.exports,console,
  require:key=>{assert.ok(Object.hasOwn(imports,key),'Unexpected dependency '+key);return imports[key]}},
{timeout:8000})
const {ClientCabinet}=m.exports
assert.equal(typeof ClientCabinet,'function')
const localeViews=['en','ru'].flatMap(locale=>['documents','profile'].map(view=>({locale,view})))
const widths=[320,354,390,430]
const docs=[
  {id:'synth-recommendation',date:'2026-10-20',consultationId:'synth-new',type:'recommendation',title:'Synthetic recommendation'},
  {id:'synth-payment',date:'2026-10-20',consultationId:'synth-new',type:'payment',title:'Synthetic receipt'},
  {id:'synth-report',date:'2026-10-08',consultationId:'synth-old',type:'report',title:'Synthetic historical report'},
]
const data={
  selector:'a'.repeat(22),name:'Synthetic Client',documents:docs,
  assessments:[],homeopathyUpdates:[],materials:[{id:'synthetic-resource',title:'Synthetic guide',url:'https://example.invalid/resource'}],
  sessions:[{id:'synthetic-session',title:'Synthetic practice',occurredOn:'2026-10-20'}],
}
const origin='http://127.0.0.1:3100'
const out='artifacts/legacy-client-cabinet/'+browserName
await mkdir(out,{recursive:true})
const browser=await (browserName==='webkit'?webkit:chromium).launch()
const evidence={scope:'ACTUAL_JSX_SYNTHETIC_SSR_CSS_ONLY_NOT_AUTH_E2E',browser:browserName,
  browserVersion:await browser.version(),sha:process.env.GITHUB_SHA,
  sourceSha256:Object.fromEntries(files.map((path,i)=>[path,createHash('sha256').update(
    [component,modernCss,globalCss,tailwindConfig][i]).digest('hex')])),cases:[]}
try{
  for(const {locale,view} of localeViews)for(const width of widths){
    const key=locale+'-'+view+'-'+width
    const markup=renderToStaticMarkup(React.createElement(ClientCabinet,{...data,locale,view}))
    const address=origin+'/__synthetic-private-cabinet/'+key
    const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1,
      isMobile:true,hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce'})
    const page=await context.newPage(),errors=[]
    page.on('pageerror',error=>errors.push(error.message))
    await page.route('**/*',route=>{
      if(route.request().isNavigationRequest()&&route.request().url()===address)
        return route.fulfill({status:200,contentType:'text/html; charset=utf-8',headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex'},
          body:'<!doctype html><html lang="'+locale+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>'+
            css+'</style></head><body>'+markup+'</body></html>'})
      return route.abort('blockedbyclient')
    })
    try{
      const response=await page.goto(address,{waitUntil:'domcontentloaded'})
      assert.equal(response?.status(),200,key)
      const cabinet=page.locator('[data-private-client-cabinet="true"]')
      assert.equal(await cabinet.count(),1,key)
      const tabs=cabinet.locator('.client-cabinet-sections a')
      assert.equal(await tabs.count(),2,key+' two original private tabs')
      assert.equal(await tabs.locator('svg[aria-hidden="true"]').count(),2)
      const measure=await page.evaluate(()=>{
        const nodes=[...document.querySelectorAll('.client-cabinet-header-actions a,.client-cabinet-header-actions button,.client-cabinet-sections a,.client-cabinet-document-actions a,.client-cabinet-filters button')]
        return {documentWidth:document.documentElement.scrollWidth,
          active:[...document.querySelectorAll('.client-cabinet-sections [aria-current="page"]')].map(n=>n.textContent.trim()),
          activeColor:getComputedStyle(document.querySelector('.client-cabinet-sections [aria-current="page"]')).backgroundColor,
          targets:nodes.map(n=>{const r=n.getBoundingClientRect();return [n.textContent.trim().slice(0,28),r.height,r.left,r.right]}),
          optionalBridge:document.querySelector('.client-cabinet-google-bridge')?.getBoundingClientRect().top,
          assessments:document.querySelector('[data-synthetic-assessments]')?.getBoundingClientRect().top}
      })
      assert.ok(measure.documentWidth<=width+2,key+' horizontal overflow '+measure.documentWidth)
      assert.equal(measure.active.length,1,key+' one selected tab')
      assert.ok(measure.active[0].includes(view==='documents'?
        (locale==='ru'?'Мои материалы':'My materials'):(locale==='ru'?'Мой профиль':'My profile')),
        key+' active label mismatch: '+JSON.stringify(measure.active))
      assert.equal(measure.activeColor,'rgb(40, 109, 86)',key+' approved green')
      assert.ok(measure.targets.every(([,height,left,right])=>height>=43.5&&left>=-2&&right<=width+2),
        key+' inaccessible targets '+JSON.stringify(measure.targets))
      if(view==='documents'){
        assert.equal(await cabinet.locator('.client-cabinet-filters button').count(),4)
        assert.equal(await cabinet.locator('.client-cabinet-consultation').count(),3)
        assert.equal(await cabinet.locator('a[href$="/pdf?locale='+locale+'"]').count(),2)
        assert.equal(await cabinet.locator('a[href*="/sessions/synthetic-session"]').count(),1)
        assert.ok(measure.optionalBridge>measure.assessments,key+' optional Google bridge order')
      }else assert.equal(await cabinet.locator('[data-synthetic-profile]').count(),1)
      assert.deepEqual(errors,[],key+' browser errors')
      if((locale==='ru'&&view==='documents'&&width===390)||
        (locale==='en'&&view==='profile'&&width===320))
        await page.screenshot({path:out+'/'+key+'.png',fullPage:true,animations:'disabled'})
      evidence.cases.push({key,...measure})
      console.log('LEGACY_CABINET_VISUAL_PASS '+key)
    }catch(error){
      evidence.error={key,message:error.message}
      await page.screenshot({path:out+'/failure-'+key+'.png',fullPage:true}).catch(()=>{})
      throw error
    }finally{await context.close()}
  }
}finally{
  await writeFile(out+'/verification.json',JSON.stringify(evidence,null,2))
  await browser.close()
}
assert.equal(evidence.cases.length,16)
console.log('LEGACY_CABINET_VISUAL_ACCEPTED '+browserName)
