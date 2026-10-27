import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const AsyncFunction=Object.getPrototypeOf(async()=>{}).constructor
function find(source,predicate){let found;const visit=n=>{if(!found&&predicate(n))found=n;ts.forEachChild(n,visit)};visit(ts.createSourceFile('source.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX));assert.ok(found);return found}

test('mentoring waits for actual source-defined post-mount state, not visible SSR free default',async()=>{
  const source=read('components/business-website-enquiry.tsx'),browser=read('scripts/verify-business-quiz-mobile.mjs')
  assert.match(source,/\[format,setFormat\]=useState<Format>\("free"\)/)
  const select=find(source,n=>ts.isJsxOpeningElement(n)&&n.tagName.getText()==='select'&&n.attributes.properties.some(a=>ts.isJsxAttribute(a)&&a.name.getText()==='data-business-field'))
  assert.equal(select.attributes.properties.find(a=>ts.isJsxAttribute(a)&&a.name.getText()==='value').initializer.getText(),'{format}')
  const effect=find(source,n=>ts.isCallExpression(n)&&n.expression.getText()==='useEffect'&&n.arguments[0]?.getText().includes('get("businessFormat")')).arguments[0].getText()
  const start=browser.indexOf("    await page.waitForURL(url=>url.pathname==='/'+locale+'/services/business-consulting'&&url.searchParams.get('businessFormat')==='mentoring')")
  const end=browser.indexOf("    assert.equal(await form.locator('[data-business-review-context]')",start)
  assert.ok(start>0&&end>start);const fragment=browser.slice(start,end)
  assert.match(fragment,/await expect\(form.locator\('\[data-business-field="format"\]'\)\).toHaveValue\('mentoring'\)/)
  assert.doesNotMatch(fragment,/waitForTimeout|setTimeout|timeout:|\.fill\(|selectOption|force:/)
  assert.match(browser,/const \{expect\}=require\(\(process.env.HH_PLAYWRIGHT_PACKAGE\|\|'playwright'\)\+'\/test'\)/)
  for(const locale of ['en','ru','es']){
    const run=async(snippet,restoreChoice=true)=>{
      let format='free',checks=0
      const restore=vm.runInNewContext('('+effect+')',{window:{location:{search:'?businessFormat=mentoring'}},URLSearchParams,setFormat:value=>{format=value}},{timeout:1000})
      const form={waitFor:async()=>assert.equal(format,'free'),locator:s=>{assert.equal(s,'[data-business-field="format"]');return {inputValue:async()=>format}}}
      const page={waitForURL:async predicate=>assert.equal(predicate(new URL('http://localhost/'+locale+'/services/business-consulting?businessFormat=mentoring#business-direct-request')),true)}
      const expect=locator=>({toHaveValue:async expected=>{assert.equal(expected,'mentoring');checks++;assert.equal(await locator.inputValue(),'free');
        // Finite source-effect replay only; no contact handler, network or real browser.
        await Promise.resolve().then(()=>{if(restoreChoice)restore()});assert.equal(await locator.inputValue(),expected,'Missing restoration stays fatal')}})
      await new AsyncFunction('page','form','expect','assert','locale',snippet)(page,form,expect,assert,locale)
      assert.equal(checks,1);assert.equal(format,'mentoring')
    }
    await run(fragment)
    await assert.rejects(()=>run(fragment,false),/Missing restoration stays fatal/)
    await assert.rejects(()=>run(fragment.replace("await expect(form.locator('[data-business-field=\"format\"]')).toHaveValue('mentoring')","assert.equal(await form.locator('[data-business-field=\"format\"]').inputValue(),'mentoring')")),/free/)
    await assert.rejects(()=>run(fragment.replace(".toHaveValue('mentoring')",".toHaveValue('free')")),/mentoring/)
  }
})

const jsx=(type,props={},key)=>({type,props,key})
const children=n=>[n?.props?.children].flat(Infinity).filter(x=>x&&typeof x==='object')
const descendants=n=>children(n).flatMap(x=>[x,...descendants(x)])
test('free-review target is the unique actual hero link despite hidden header and repeated footer links',async()=>{
  const source=read('components/personal-service-landing.tsx'),browser=read('scripts/verify-public-services-production.mjs')
  const hero=find(source,n=>ts.isJsxElement(n)&&n.openingElement.tagName.getText()==='section'&&n.openingElement.attributes.properties.some(a=>ts.isJsxAttribute(a)&&a.name.getText()==='aria-labelledby'&&a.initializer?.getText()==='"personal-service-title"')).getText()
  assert.match(read('components/site-navigation.tsx'),/className="site-nav-free-entry" href=\{freeReviewHref\}/)
  const start=browser.indexOf('      const free = ',browser.indexOf('for (const service of ["imagery-therapy", "systemic-constellations"])')),end=browser.indexOf('      const primary = ',start)
  assert.ok(start>0&&end>start);const fragment=browser.slice(start,end)
  assert.match(fragment,/await expect\(free\).toHaveCount\(1\)/);assert.doesNotMatch(fragment,/\.first\(|force:|:visible|waitForTimeout/)
  const compiled=ts.transpileModule('export const render=({styles,t,ui,facts,locale,service,personalServiceImages,Image,Link,Clock3,CalendarCheck2,ShieldCheck,ArrowRight})=>('+hero+')',{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true})
  assert.deepEqual(compiled.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error),[])
  const exports={};vm.runInNewContext(compiled.outputText,{exports,require:name=>{assert.equal(name,'react/jsx-runtime');return {jsx,jsxs:jsx}}},{timeout:1000})
  for(const locale of ['en','ru','es'])for(const service of ['imagery-therapy','systemic-constellations']){
    const run=async(snippet,duplicate=false)=>{
      const href='/'+locale+'/services/free-situation-review'
      const tree=exports.render({styles:{},t:{},ui:{},facts:{},locale,service,personalServiceImages:{[service]:'/images/inert.webp'},Image:'img',Link:'a',Clock3:'svg',CalendarCheck2:'svg',ShieldCheck:'svg',ArrowRight:'svg'})
      if(duplicate)tree.props.children=[tree.props.children,jsx('a',{href})]
      // Synthetic copies model the exact hidden header failure and closing CTA;
      // the selected hero itself is rendered from current production JSX.
      const mainTree=jsx('main',{children:[jsx('a',{href,hidden:true}),tree,jsx('a',{href})]})
      const locate=matches=>({first:()=>locate(matches.slice(0,1)),count:async()=>matches.length,visible:()=>{assert.equal(matches.length,1);assert.equal(matches[0].props.hidden,undefined,'Hidden header is not hero alternative')}})
      const main={locator:selector=>{assert.equal(selector.match(/a\[href="([^"]+)"\]/)?.[1],href);const roots=selector.startsWith('section[aria-labelledby="personal-service-title"] ')?descendants(mainTree).filter(n=>n.type==='section'&&n.props['aria-labelledby']==='personal-service-title'):[mainTree];return locate(roots.flatMap(descendants).filter(n=>n.type==='a'&&n.props.href===href))}}
      await new AsyncFunction('main','locale','expect','visible',snippet)(main,locale,target=>({toHaveCount:async count=>assert.equal(await target.count(),count,'Unique hero alternative')}),async target=>target.visible())
    }
    await run(fragment)
    await assert.rejects(()=>run(fragment,true),/Unique hero alternative/)
    await assert.rejects(()=>run("const free=main.locator('a[href=\"/'+locale+'/services/free-situation-review\"]').first();await visible(free);"),/Hidden header is not hero alternative/)
  }
})
