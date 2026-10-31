// Synthetic hosted-only Chromium/WebKit acceptance for actual signed report JSX.
import assert from 'node:assert/strict'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { chromium, webkit, expect } from '@playwright/test'
import { buildCoastalFixture, syntheticCases, widths, origin, scope, requireHosted } from './helpers/client-report-coastal-fixture.mjs'

requireHosted(process.env)
const browserName=process.env.HH_TEST_BROWSER
assert.ok(['chromium','webkit'].includes(browserName))
const browserEngine=browserName==='webkit'?webkit:chromium
const out='artifacts/client-report-coastal-v2/'+browserName
await mkdir(out,{recursive:true})
const fixture=await buildCoastalFixture()
const cases=syntheticCases()
const evidence={commit:process.env.GITHUB_SHA,browser:browserName,scope,sourceProof:fixture.sourceProof,
  expectedCases:cases.length*widths.length,cases:[],failure:null}
const screenshotCases=new Set(['ru/full/390','en/full/1280','ru/compact/390'])
const browser=await browserEngine.launch()
evidence.browserVersion=await browser.version()
let currentPage=null,currentId=''
try{
  for(const sample of cases)for(const width of widths){
    const caseId=[sample.locale,sample.mode,width].join('/')
    currentId=caseId
    const shotDir=out+'/'+sample.locale+'-'+sample.mode+'-'+width
    await mkdir(shotDir,{recursive:true})
    const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',
      deviceScaleFactor:1,reducedMotion:'reduce'})
    context.setDefaultTimeout(15000)
    const blocked=[],errors=[],assets=[]
    const url=origin+sample.path
    await context.route('**/*',async route=>{
      const request=route.request()
      const address=request.url()
      if(address===url && request.isNavigationRequest() && request.method()==='GET'){
        return route.fulfill({contentType:'text/html',headers:{
          'Cache-Control':'no-store',
          'Content-Security-Policy':"default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'none'; connect-src 'none'; base-uri 'none'; frame-src 'none'; form-action 'none'",
        },body:fixture.document(sample)})
      }
      if(address===origin+'/images/holistic-house/report-lighthouse-coast.svg'){
        assets.push(address)
        return route.fulfill({status:200,contentType:'image/svg+xml',body:fixture.imageBytes})
      }
      // Current coastal theme also layers same-origin AVIF/WebP versions.
      // Only these known static files are permitted by the isolated fixture.
      if(address===origin+'/images/holistic-house/report-lighthouse-coast.avif' ||
         address===origin+'/images/holistic-house/report-lighthouse-coast.webp'){
        const modern=address.endsWith('.avif')
        assets.push(address)
        return route.fulfill({status:200,contentType:modern?'image/avif':'image/webp',
          body:await readFile(new URL('../public/images/holistic-house/report-lighthouse-coast.'+(modern?'avif':'webp'),import.meta.url))})
      }
      if(address===origin+'/images/holistic-house/homepage-botanical.svg'){
        assets.push(address)
        return route.fulfill({status:200,contentType:'image/svg+xml',body:fixture.botanicalBytes})
      }
      if(address===origin+'/document-assets/lighthouse.png'){
        assets.push(address)
        return route.fulfill({status:200,contentType:'image/png',body:await readFile(
          new URL('../public/document-assets/lighthouse.png',import.meta.url))})
      }
      blocked.push({method:request.method(),url:address})
      return route.abort('blockedbyclient')
    })
    const page=await context.newPage()
    currentPage=page
    page.on('pageerror',e=>errors.push(e.message))
    try{
      const response=await page.goto(url,{waitUntil:'load',timeout:20000})
      assert.equal(response.status(),200)
      const root=page.locator('[data-hh-report-theme="coastal-v2"]')
      await expect(root).toHaveCount(1)
      await expect(root).toBeVisible()
      const full=sample.mode==='full'
      const hero=full?page.locator('.canonical-report-cover'):page.locator('section')
        .filter({has:page.locator('[id="session-title"]')}).first()
      if(full){
        await expect(page.locator('.canonical-report-cover')).toHaveCount(1)
        await expect(page.locator('.canonical-progress-dial')).toHaveCount(2)
        await expect(page.locator('.canonical-recommended-tests a')).toHaveCount(0)
        await expect(page.locator('.canonical-recommended-tests')).toBeHidden()
        await expect(page.locator('#session-recommended-tests')).toBeVisible()
        await expect(page.locator('#session-recommended-tests a')).toHaveCount(2)
        await expect(page.locator('#session-download a')).toHaveCount(2)
        await expect(page.locator('details.canonical-remedy-profile-disclosure')).toHaveCount(1)
        await expect(page.locator('.canonical-remedy--unified')).toHaveCount(1)
        await expect(page.locator('.canonical-remedy-unified-thumb img')).toHaveCount(1)
        await expect(page.locator('.canonical-remedy-profiles')).toHaveCount(0)
        // Render the real signed JSX: the synthetic potency belongs next to the
        // remedy title, with identical typography and no duplicate regimen label.
        const prescriptionTitle=page.locator('.canonical-remedy-title .canonical-remedy-unified-name')
        await expect(prescriptionTitle.locator('.canonical-remedy-potency')).toHaveText('30')
        const titleTypography=await prescriptionTitle.evaluate(node=>{
          const label=node.querySelector('.canonical-remedy-potency')
          const font=n=>{
            const s=getComputedStyle(n)
            return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight]
          }
          return {name:font(node),potency:font(label)}
        })
        assert.deepEqual(titleTypography.potency,titleTypography.name,
          'Potency must use exactly the remedy title font and size')
        const regimen=page.locator('.canonical-remedy-schedule')
        await expect(regimen).toContainText(sample.locale==='ru'?'6 гранул':'6 granules')
        assert.doesNotMatch(await regimen.innerText(),/потенция|potency|30/i,
          'The potency must not repeat on the administration line')
        await expect(page.locator('#session-resources')).toBeVisible()
        await expect(page.locator('#session-download')).toBeVisible()
      }else{
        await expect(page.locator('.canonical-report-cover')).toHaveCount(0)
        await expect(page.locator('[id="session-title"]')).toBeVisible()
      }
      const geometry=await page.evaluate(()=>{
        const root=document.querySelector('[data-hh-report-theme="coastal-v2"]')
        const cover=document.querySelector('.canonical-report-cover')
        const hero=cover||root.querySelector('section[class*="sessionHero"]')
        const inspect=['.canonical-report-cover','.canonical-report-heading','.canonical-client',
          '.canonical-progress','.canonical-report-analysis','.canonical-remedy',
          '.canonical-recommended-tests','[id="session-title"]','[data-hh-report-next-actions]','#session-resources']
        const bounds=n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,
          overflow:n.scrollWidth>n.clientWidth+2 && !['auto','scroll'].includes(getComputedStyle(n).overflowX),
          clipped:n.scrollWidth>n.clientWidth+2}}
        const elements=inspect.flatMap(sel=>[...document.querySelectorAll(sel)].map(n=>({
          selector:sel,text:n.textContent.trim().slice(0,60),...bounds(n),
        }))).filter(n=>n.width>0)
        const topHeading=cover?.querySelector('h1')
        const overflowCandidates=[...document.querySelectorAll('body *')].filter(n=>{
          const r=n.getBoundingClientRect(),cs=getComputedStyle(n)
          return r.width>0 && r.height>0 && cs.display!=='none' && (r.right>innerWidth+1 || r.left < -1)
        }).map(n=>({tag:n.tagName,cls:typeof n.className==='string'?n.className.slice(0,110):'',
          rect:{left:+n.getBoundingClientRect().left.toFixed(1),right:+n.getBoundingClientRect().right.toFixed(1),
            width:+n.getBoundingClientRect().width.toFixed(1)},scrollWidth:n.scrollWidth,clientWidth:n.clientWidth,
          overflowX:getComputedStyle(n).overflowX,text:n.textContent.trim().slice(0,50)})).slice(0,45)
        const rects=Object.fromEntries(['body','[data-hh-report-theme="coastal-v2"]',
          '[class*="cabinetSessionPage"]','.canonical-document--editorial'].map(sel=>{
            const n=document.querySelector(sel),r=n?.getBoundingClientRect()
            return [sel,r?{left:r.left,right:r.right,width:r.width}:null]
          }))
        return {width:innerWidth,documentWidth:document.documentElement.scrollWidth,
          bodyWidth:document.body.scrollWidth,heroBackground:hero?getComputedStyle(hero).backgroundImage:'',
          titleColor:topHeading?getComputedStyle(topHeading).color:'',
          rects,overflowCandidates,elements}
      })
      const buttons=await page.evaluate(()=>{
        const primary=document.querySelector('[data-hh-report-next-actions] [class*="sessionBottomPrimary"]')
        const secondary=document.querySelector('#session-recommended-tests [class*="reportTestCatalogLink"]')
        const values=el=>el?{label:el.textContent.trim(),color:getComputedStyle(el).color,
          background:getComputedStyle(el).backgroundColor,contrastText:getComputedStyle(el).webkitTextFillColor}:null
        const top=sel=>document.querySelector(sel)?.getBoundingClientRect().top ?? null
        return {primary:values(primary),secondary:values(secondary),
          sections:[top('[data-hh-report-next-actions]'),top('#session-recommended-tests'),
            top('#session-download')]}
      })
      assert.ok(buttons.primary?.label,'Cabinet save action must remain readable')
      assert.ok(buttons.secondary?.label,'Bonus tests action must remain readable')
      assert.equal(buttons.primary.color,'rgb(255, 255, 255)','Cabinet save must retain white text')
      assert.equal(buttons.secondary.color,'rgb(27, 96, 112)','Bonus tests action must have teal contrast text')
      assert.equal(buttons.secondary.background,'rgb(255, 254, 250)','Bonus tests button must have a light paper background')
      if(full)assert.ok(buttons.sections.every(n=>typeof n==='number')&&
        buttons.sections[0]<buttons.sections[1]&&buttons.sections[1]<buttons.sections[2],
        'Report must end with Cabinet save, recommended tests, then PDF')
      const findings=[]
      if(geometry.documentWidth>width+2||geometry.bodyWidth>width+2)
        findings.push('document horizontal overflow '+geometry.documentWidth+'/'+width)
      for(const el of geometry.elements)if(el.left < -2||el.right >width+2)
        findings.push('outside viewport '+el.selector+' '+JSON.stringify(el))
      assert.ok(assets.includes(origin+'/images/holistic-house/report-lighthouse-coast.svg'),
        caseId+' background asset did not load through the isolated same-origin route')
      assert.ok(geometry.heroBackground.includes('report-lighthouse-coast.svg'),
        caseId+' missing coast artwork in computed hero: '+geometry.heroBackground)
      if(full)assert.equal(geometry.titleColor,'rgb(255, 255, 255)','Lighthouse heading has insufficient contrast')
      await writeFile(shotDir+'/geometry.json',JSON.stringify({geometry,buttons,findings},null,2))
      assert.deepEqual(findings,[],caseId+' visual overflow findings; offenders='+JSON.stringify(geometry.overflowCandidates.slice(0,8)))
      if(full){
        const detail=page.locator('details.canonical-remedy-profile-disclosure')
        await expect(detail).not.toHaveAttribute('open')
        await detail.locator('summary').focus()
        await page.keyboard.press('Enter')
        await expect(detail).toHaveAttribute('open','')
        await page.keyboard.press('Enter')
        await expect(detail).not.toHaveAttribute('open')
      }
      if(screenshotCases.has(caseId)){
        await page.screenshot({path:shotDir+'/screen.png',fullPage:true,animations:'disabled'})
      }
      if(full){
        await page.emulateMedia({media:'print'})
        const print=await page.locator('.canonical-report-cover').evaluate(node=>({
          background:getComputedStyle(node).backgroundImage,
          display:getComputedStyle(node).display,
        }))
        assert.equal(print.background,'none','Coastal hero must not override signed print document')
        assert.ok(print.display!=='none','Original signed report remains printable')
      }
      assert.deepEqual(errors,[],caseId+' JS browser errors')
      assert.deepEqual(blocked,[],caseId+' unexpected requests')
      evidence.cases.push({caseId,width,mode:sample.mode,locale:sample.locale,
        assets:assets.map(x=>x.split('/').slice(-1)[0]),geometry,findings,errors,blocked})
      console.log('COASTAL_VISUAL_PASS '+caseId)
    }catch(e){
      // Safe synthetic fixture only; preserve the exact rendered CSS/HTML for
      // local geometric diagnosis without connecting to a real client session.
      await writeFile(shotDir+'/synthetic-report.html',fixture.document(sample)).catch(()=>{})
      await page.screenshot({path:shotDir+'/failure.png',animations:'disabled',fullPage:true}).catch(()=>{})
      await writeFile(shotDir+'/failure.json',JSON.stringify({message:e.message,blocked,errors},null,2))
      throw e
    }finally{currentPage=null;await context.close()}
  }
  assert.equal(evidence.cases.length,evidence.expectedCases)
}catch(e){
 evidence.failure={case:currentId,message:e.message}
 await currentPage?.screenshot({path:out+'/failure.png'}).catch(()=>{})
 throw e
}finally{
 await writeFile(out+'/verification.json',JSON.stringify(evidence,null,2))
 await browser.close()
}
