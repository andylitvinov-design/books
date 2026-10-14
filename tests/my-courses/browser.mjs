import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { chromium, webkit, expect } from '@playwright/test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

// Render the actual My Courses React component with synthetic state.
// No account, payment, backend mutations, credentials or patient data.
const require = createRequire(import.meta.url)
const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8')
const modules = prefix => ({ __esModule:true, default:new Proxy({}, { get:(_,key) => prefix+key }) })
function loadComponent(path, dependencies) {
  const compiled = ts.transpileModule(read(path), {
    fileName:path,
    compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,esModuleInterop:true},
  }).outputText
  const loaded = { exports:{} }
  runInNewContext(compiled, { exports:loaded.exports, require:name=>dependencies[name]||require(name) })
  return loaded.exports.default
}
const goals = {
  energy_agency: { title:{ru:'Энергия и действие',en:'Energy & action'} },
  calm_regulation: { title:{ru:'Спокойствие и заземление',en:'Calm & grounding'} },
}
const CourseEntrySelector = loadComponent('components/app/course-entry-selector.jsx', {
  '@/lib/inner-growth/course-model':{GROWTH_GOALS:goals,COURSE_TOPICS:[]},
  '@/lib/inner-growth/course-programs':{courseProgramFromTopics:()=>null},
  './course-14-day-overview':() => React.createElement('section', {'data-course-14-day-overview':true},'Synthetic course overview'),
  './course-entry-selector.module.css':modules('selector_'),
})
// Mirror CSS Modules local-class transformation for this isolated browser fixture.
const scopedCss = (path,prefix) => read(path).replace(/\.([a-zA-Z][\w-]*)/g,'.'+prefix+'$1')
const css = read('app/[locale]/app/[[...path]]/workspace.css') + '\n'
  + read('components/app/my-course-theme.css') + '\n'
  + scopedCss('components/app/course-entry-selector.module.css','selector_')
const img = fileURLToPath(new URL('../../public/images/holistic-house/course-focus-mountain-boy.webp',import.meta.url))
function fixture(locale) {
  const russian = locale === 'ru'
  const html = renderToStaticMarkup(React.createElement(CourseEntrySelector,{
    locale, course:{id:'synthetic-course',stage:4,goals:['energy_agency','calm_regulation']},onOpen:()=>{},
  }))
  return '<!doctype html><html lang="'+locale+'"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<base href="http://localhost/"><title>Synthetic My Courses mobile acceptance</title>'
    + '<style>body{margin:0}'+css+'</style></head>'
    + '<body><main class="hh-app">'
    + '<header class="hh-header"><a href="#" class="hh-brand">Holistic House<span>'
    + (russian?'МОИ КУРСЫ':'MY COURSES')+'</span></a>'
    + '<a href="#" class="hh-master-header-link">'+(russian?'Мастер':'Master')+'</a>'
    + '<details class="hh-account-menu"><summary>'+(russian?'Аккаунт':'Account')
    + '</summary><div></div></details></header>'
    + html
    + '<nav class="hh-mobile-app-nav" aria-label="Cabinet"><a href="#">'
    + (russian?'Главная':'Home')+'</a><a href="#">'+(russian?'Мои тесты':'My tests')
    + '</a><a href="#">'+(russian?'Результаты':'Insights')+'</a><a href="#">'
    + (russian?'Профиль':'Profile')+'</a><a href="#" aria-current="page">'
    + (russian?'Мои курсы':'My courses')+'</a></nav></main></body></html>'
}

const engineName = process.env.HH_TEST_BROWSER || 'chromium'
assert.ok(['chromium','webkit'].includes(engineName))
const engine = engineName === 'webkit' ? webkit : chromium
const evidence = { engine:engineName,synthetic:true,cases:[] }
const folder='artifacts/my-courses-mobile/'+engineName
mkdirSync(folder,{recursive:true})
const browser=await engine.launch()
try {
  for(const locale of ['ru','en']){
    for(const width of [320,360,390,430,768,1280]){
      const context=await browser.newContext({viewport:{width,height:850},serviceWorkers:'block',deviceScaleFactor:1})
      await context.route('**/*',route=>{
        if(route.request().url.endsWith('/images/holistic-house/course-focus-mountain-boy.webp'))
          return route.fulfill({path:img,contentType:'image/webp'})
        return route.abort()
      })
      const page=await context.newPage()
      const pageErrors=[]
      page.on('pageerror', e=>pageErrors.push(e.message))
      try{
        await page.setContent(fixture(locale))
        const card=page.locator('[data-current-course-card]')
        const plan=card.locator('button[class*="selector_planButton"]')
        const add=page.locator('[data-add-course]')
        await expect(card).toHaveCount(1)
        await expect(plan).toHaveText(locale==='ru'?'План курса':'Course plan')
        await expect(add).toBeVisible()
        await expect(page.locator('.selector_currentPhoto img')).toHaveJSProperty('complete',true)
        const metrics=await page.evaluate(()=>{
          const item=sel=>document.querySelector(sel)
          const rect=sel=>{const r=item(sel).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}}
          return {
            viewport:innerWidth,document:document.documentElement.scrollWidth,
            card:rect('[data-current-course-card]'),row:rect('.selector_currentTop'),
            photo:rect('.selector_currentPhoto'),heading:rect('.selector_currentText h2'),
            axes:rect('.selector_axes'),cta:rect('.selector_openButton'),
            plan:rect('.selector_planButton'),add:rect('[data-add-course]'),
            photoLoaded:item('.selector_currentPhoto img').naturalWidth>0,
            planFragments:item('.selector_planButton span').getClientRects().length,
            planWhiteSpace:getComputedStyle(item('.selector_planButton span')).whiteSpace,
            mottoDisplay:getComputedStyle(item('.selector_headerMotto')).display,
          }
        })
        assert.ok(metrics.document<=metrics.viewport+1,locale+'/'+width+' document overflow '+JSON.stringify(metrics))
        assert.ok(metrics.photoLoaded,locale+'/'+width+' missing approved image')
        assert.ok(metrics.photo.right<=metrics.heading.left+1,locale+'/'+width+' image/title overlap')
        assert.ok(metrics.axes.top>=metrics.row.bottom-1,locale+'/'+width+' focus chips stuck in narrow column')
        assert.ok(metrics.add.top>=metrics.card.bottom-2,locale+'/'+width+' add tile overlaps active course')
        assert.equal(metrics.planFragments,1,locale+'/'+width+' plan text wraps')
        assert.equal(metrics.planWhiteSpace,'nowrap')
        assert.ok(metrics.plan.height>=44,locale+'/'+width+' plan target smaller than 44px')
        assert.ok(metrics.cta.height>=44,locale+'/'+width+' continue target smaller than 44px')
        if(width<=690){
          assert.equal(metrics.mottoDisplay,'none',locale+'/'+width+' squeezed decorative motto')
          assert.ok(metrics.cta.width >= metrics.card.width-45,locale+'/'+width+' continue CTA not full width')
          assert.ok(metrics.photo.height<=140,locale+'/'+width+' photo too tall')
          assert.ok(metrics.card.height<=455,locale+'/'+width+' card too tall')
          assert.ok(metrics.plan.left>=metrics.card.left,locale+'/'+width+' clipped secondary plan link')
          assert.ok(metrics.plan.right<=metrics.card.right+1,locale+'/'+width+' clipped plan link')
        }
        if([320,390].includes(width)){
          await page.screenshot({path:folder+'/'+locale+'-'+width+'.png',fullPage:true})
        }
        assert.deepEqual(pageErrors,[],locale+'/'+width+' console errors')
        evidence.cases.push({locale,width,documentOverflow:false,planSingleLine:true,
          imageLoaded:true,cardHeight:Math.round(metrics.card.height),ctaWidth:Math.round(metrics.cta.width),
          planWidth:Math.round(metrics.plan.width)})
      } finally {await context.close()}
    }
  }
  console.log(JSON.stringify(evidence,null,2))
} finally {
  writeFileSync(folder+'/summary.json',JSON.stringify(evidence,null,2)+'\n')
  await browser.close()
}
