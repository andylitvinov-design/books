// Synthetic, offline React lifecycle and disclosure acceptance. No app server,
// database, client data, or production origin is used. Real React/ReactDOM run
// the current component; unrelated gauge/banner/guide modules are isolated stubs.
// Acceptance contract: one useful, non-score-prefixed primary action per selected
// verified scale; professional/safety precedence; original guidance preserved in
// disclosure without an identical primary duplicate; one final methodology/source
// section. Ordinary selection starts at the lowest valid within-range fraction,
// stable ties; same-result rerenders preserve the choice and new results reset it.
// Bach ranking and scoring/provenance contracts are covered by dedicated suites.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'

const work = fileURLToPath(new URL('../', import.meta.url))
const req = createRequire(import.meta.url)
const ts = req('typescript')
const { chromium, webkit } = req('@playwright/test')
const browserName = process.env.HH_TEST_BROWSER || 'chromium'
const browserType = { chromium, webkit }[browserName]
if (!browserType) throw new Error('Unsupported HH_TEST_BROWSER: ' + browserName)
const evidenceDirectory = path.join(work, 'artifacts/app-r1/assessment-primary-' + browserName)
fs.mkdirSync(evidenceDirectory, { recursive: true })
const crypto = { createHash }
const modules = {};
function addFile(file) {
  if (modules[file]) return file;
  const code = fs.readFileSync(file, 'utf8');
  modules[file] = { code, deps: {} };
  const localRequire = createRequire(file);
  for (const match of code.matchAll(/require\(["']([^"']+)["']\)/g)) {
    const name = match[1];
    modules[file].deps[name] = addFile(localRequire.resolve(name));
  }
  return file;
}
function addVirtual(id, code, deps = {}) { modules[id] = { code, deps }; return id; }
const react = addFile(req.resolve('react'));
const client = addFile(req.resolve('react-dom/client'));
const dom = addFile(req.resolve('react-dom'));
const jsxRuntime = addFile(req.resolve('react/jsx-runtime'));
const transpile = relative => ts.transpileModule(fs.readFileSync(path.join(work, relative), 'utf8'), {
  fileName: relative, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText;
const overview = addVirtual('overview', transpile('lib/assessments/result-overview.js'));
// Keep the current evidence-status logic in the real synthetic report, not a fake
// clinical-quality status. This pure module requires no account or network data.
const evidenceStatus = addVirtual('evidence-status', transpile('lib/assessments/assessment-evidence-status.js'));
const stubs = addVirtual('stubs', `const React=require('react');
exports.FreeCourseBanner=({locale})=>React.createElement('aside',{'data-synthetic-banner':true},locale==='ru'?'Учебный блок':'Learning block');
exports.ScoreGauge=({dimension})=>React.createElement('span',{'data-synthetic-gauge':true},dimension?.value);
exports.ScoreTrend=()=>null;
exports.getTestScaleGuide=()=>({scales:[]});
exports.gaugeModel=()=>null;`, { react });
const css = addVirtual('css', "module.exports={default:new Proxy({},{get:(_,key)=>key})}");
addVirtual('component', transpile('components/app/compact-assessment-report.jsx'), {
  react, 'react/jsx-runtime': jsxRuntime,
  './free-course-banner': stubs, './assessment-gauge': stubs,
  '@/lib/assessments/scale-guides': stubs, '@/lib/assessments/dashboard-gauges': stubs,
  '@/lib/assessments/result-overview': overview,
  '@/lib/assessments/assessment-evidence-status': evidenceStatus,
  './compact-assessment-report.module.css': css,
});
const bootstrap = `
const React=load(${JSON.stringify(react)}),{createRoot}=load(${JSON.stringify(client)}),{flushSync}=load(${JSON.stringify(dom)}),{CompactAssessmentReport}=load('component');
window.acceptanceErrors=[];window.addEventListener('error',e=>window.acceptanceErrors.push(e.message));
const originalError=console.error;console.error=(...args)=>{window.acceptanceErrors.push(args.map(String).join(' '));originalError(...args)};
const root=createRoot(document.getElementById('app'));
function propsFor(id,locale='en',guest=false,review=false){
 const ru=locale==='ru'; const values=id==='B'?[6,8,1]:[8,2,6];
 const sections=values.map((value,i)=>({key:'scale-'+i,construct:(ru?'Шкала ':'Scale ')+(i+1),value,min:0,max:10,bandBasis:'descriptive',band:ru?'Описательная шкала':'Descriptive scale',summary:(ru?'Краткое объяснение ':'Short explanation ')+i,meaning:(ru?'Полное исходное объяснение ':'Full original explanation ')+i,primarySupport:(ru?'Можно спокойно отметить один полезный пример ':'Consider one helpful example ')+i,steps:[(ru?'Исходное наблюдение с баллом ':'Original score-linked observation ')+value,(ru?'Можно спокойно отметить один полезный пример ':'Consider one helpful example ')+i,(ru?'Дополнительный исходный шаг ':'Additional original step ')+i],followUp:(ru?'Обсудите беспокоящие симптомы со специалистом ':'Discuss concerning symptoms with a professional ')+i,source:'https://example.invalid/'+id+'/'+locale+'/scale-'+i,recommendedReview:review&&i===0}));
 return {locale,result:{...(guest?{}:{id}),definitionKey:'synthetic-local-fixture',dimensions:sections.map(({key,value,min,max})=>({key,value,min,max}))},report:{verified:true,sections,rulesVersion:'synthetic-acceptance-only',methodology:ru?'Методика синтетической проверки':'Synthetic acceptance methodology',seekSupport:sections[0].followUp,purpose:ru?'Синтетические данные':'Synthetic data',note:ru?'Не клинические данные':'No clinical data'}};
}
window.acceptance={propsFor,render(props){flushSync(()=>root.render(React.createElement(CompactAssessmentReport,props)))},click(key){flushSync(()=>document.querySelector('[data-assessment-scale-trigger="'+key+'"]').click())},errors:window.acceptanceErrors};
window.acceptance.render(propsFor('A'));
`;
const mapText = Object.entries(modules).map(([id,{code,deps}])=>`${JSON.stringify(id)}:[function(module,exports,require){\n${code}\n},${JSON.stringify(deps)}]`).join(',\n');
const runtime = `const process={env:{NODE_ENV:'development'}};const modules={${mapText}};const cache={};function load(id){if(cache[id])return cache[id].exports;const [factory,deps]=modules[id];const module={exports:{}};cache[id]=module;factory(module,module.exports,name=>load(deps[name]));return module.exports;}\n${bootstrap}`;
const style = fs.readFileSync(path.join(work,'components/app/compact-assessment-report.module.css'),'utf8');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:;"><title>Local synthetic React acceptance</title><style>body{background:#f7f5ef;margin:24px}main{max-width:680px;margin:auto}h1{font:22px system-ui}body>p{font:13px system-ui;color:#555}${style}</style></head><body><h1>Local synthetic React acceptance</h1><p>State, disclosure and source-link verification. Gauge and banner are test stubs.</p><main id="app"></main><script>${runtime.replace(/<\/script/gi,'<\\/script')}</script></body></html>`;
const fixture = path.join(evidenceDirectory,'react-browser-fixture.html');
fs.writeFileSync(fixture,html);
let browser, page
const fixtureUrl = pathToFileURL(fixture).href
;(async()=>{
 browser=await browserType.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const unexpectedRequests=[]; const consoleErrors=[];
 await context.route('**/*',route=>{const url=route.request().url();if(url!==fixtureUrl){unexpectedRequests.push(url);return route.abort()}return route.continue()});
 page=await context.newPage();page.on('pageerror',e=>consoleErrors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
 await page.goto(fixtureUrl);await page.waitForFunction(()=>window.acceptance);
 const result=await page.evaluate(()=>{
   const checks=[];
   function check(name,condition,actual){checks.push({name,passed:Boolean(condition),actual});if(!condition)throw new Error(name+': '+JSON.stringify(actual))}
   const active=()=>document.querySelector('[data-active-scale]')?.getAttribute('data-active-scale');
   const selectedSource=()=>document.querySelector('[data-assessment-methodology] a')?.getAttribute('href');
   function content(props,index,label){
     const section=props.report.sections[index],panel=document.querySelector('[data-active-scale]'),primary=panel.querySelectorAll('[data-primary-support]'),details=panel.querySelector('details');
     const expected=section.recommendedReview?section.followUp:section.primarySupport;
     check(label+' one primary',primary.length===1,primary.length);
     check(label+' primary visible outside disclosure',primary[0].textContent===expected&&!primary[0].closest('details')&&primary[0].getClientRects().length>0&&getComputedStyle(primary[0]).visibility!=='hidden',primary[0].textContent);
     check(label+' exact primary not repeated',!details.textContent.includes(expected),details.textContent);
     check(label+' original guidance retained',section.steps.every(step=>panel.textContent.includes(step))&&panel.textContent.includes(section.meaning)&&panel.textContent.includes(section.followUp));
     check(label+' source at final methodology once',selectedSource()===section.source&&document.querySelectorAll('a[href="'+section.source+'"]').length===1,selectedSource());
     check(label+' methodology one block',document.querySelectorAll('[data-assessment-methodology]').length===1);
     const footerText=[...document.querySelectorAll('[data-assessment-methodology] p')].map(p=>p.textContent);
     check(label+' footer omits identical primary support',expected!==props.report.seekSupport||!footerText.includes(expected));
     check(label+' original global support stays accessible',document.getElementById('app').textContent.includes(props.report.seekSupport));
   }
   for(const locale of ['en','ru']){
     const a=acceptance.propsFor('A',locale),b=acceptance.propsFor('B',locale);acceptance.render(b);acceptance.render(a);
     check(locale+' initial lowest fraction',active()==='scale-1',active());content(a,1,locale+' initial');
     acceptance.click('scale-0');check(locale+' real click changes panel',active()==='scale-0',active());content(a,0,locale+' clicked');
     acceptance.render(structuredClone(a));check(locale+' same-id clone retains choice',active()==='scale-0',active());
     acceptance.render(b);check(locale+' B resets to its default',active()==='scale-2',active());content(b,2,locale+' B');
     acceptance.render(a);check(locale+' A return resets stale choice',active()==='scale-1',active());content(a,1,locale+' A return');
     const review=acceptance.propsFor('review-'+locale,locale,false,true);acceptance.render(review);check(locale+' professional review precedence',active()==='scale-0',active());content(review,0,locale+' review');
     const guest=acceptance.propsFor('A',locale,true);acceptance.render(guest);acceptance.click('scale-2');acceptance.render(structuredClone(guest));check(locale+' guest clone retains choice',active()==='scale-2',active());
     check(locale+' correct localized heading',document.querySelector('[data-primary-support]').previousElementSibling.textContent===(locale==='ru'?'Поддержка в вашем темпе':'Support at your own pace'));
     const rejected=acceptance.propsFor('unverified-'+locale,locale);rejected.report.verified=false;rejected.report.intro='Unverified synthetic result';
     rejected.report.sections=rejected.report.sections.map(section=>({...section,bandBasis:'unavailable',steps:[],primarySupport:null}));acceptance.render(rejected);
     check(locale+' unverified report has no primary',document.querySelectorAll('[data-primary-support]').length===0);
     check(locale+' unverified report keeps global support',document.querySelector('[data-assessment-methodology]').textContent.includes(rejected.report.seekSupport));
   }
   check('no React console errors',acceptance.errors.length===0,acceptance.errors);
   return {checks,passed:checks.every(item=>item.passed),reactVersion:React.version};
 });
 for(const locale of ['en','ru']){
   await page.evaluate(locale=>{acceptance.render(acceptance.propsFor('screenshot-'+locale,locale));document.documentElement.lang=locale},locale);
   await page.screenshot({path:path.join(evidenceDirectory,'react-browser-'+locale+'-390.png'),fullPage:true});
   await page.locator('[data-active-scale] details summary').focus();await page.keyboard.press('Enter');
   const footer=page.locator('[data-assessment-methodology]'),summary=footer.locator('summary');
   if(await footer.getAttribute('open')!==null){await summary.focus();await page.keyboard.press('Enter')}
   await summary.focus();await page.keyboard.press('Enter');
   const keyboardOpen=await footer.getAttribute('open')!==null;
   const initialHref=await footer.locator('a').getAttribute('href'),initialVisible=await footer.locator('a').isVisible();
   await page.locator('[data-assessment-scale-trigger="scale-0"]').click();
   const changedHref=await footer.locator('a').getAttribute('href'),changedVisible=await footer.locator('a').isVisible();
   const passed=keyboardOpen&&initialVisible&&changedVisible&&initialHref==='https://example.invalid/screenshot-'+locale+'/'+locale+'/scale-1'&&changedHref==='https://example.invalid/screenshot-'+locale+'/'+locale+'/scale-0';
   result.checks.push({name:locale+' keyboard Enter opens final method and selected source remains visible while href changes',passed,actual:{keyboardOpen,initialVisible,changedVisible,initialHref,changedHref}});
   if(!passed)throw Error('Keyboard/source acceptance failed for '+locale);
   await page.screenshot({path:path.join(evidenceDirectory,'react-browser-'+locale+'-expanded-390.png'),fullPage:true});
   fs.writeFileSync(path.join(evidenceDirectory,'react-browser-'+locale+'-dom.html'),await page.content());
 }
 result.checkedAt=new Date().toISOString();result.browserVersion=browser.version();result.browserName=browserName;result.viewport={width:390,height:844};result.unexpectedRequests=unexpectedRequests;result.consoleErrors=consoleErrors;
 result.componentSha256=crypto.createHash('sha256').update(fs.readFileSync(path.join(work,'components/app/compact-assessment-report.jsx'))).digest('hex');
 result.overviewSha256=crypto.createHash('sha256').update(fs.readFileSync(path.join(work,'lib/assessments/result-overview.js'))).digest('hex');
 result.passed=result.passed&&!unexpectedRequests.length&&!consoleErrors.length;
 fs.writeFileSync(path.join(evidenceDirectory,'react-browser-acceptance.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({passed:result.passed,checks:result.checks.length,react:result.reactVersion,browser:result.browserVersion,unexpectedRequests,consoleErrors},null,2));
 await browser.close();if(!result.passed)process.exitCode=1;
})().catch(async error => {
  const failure = { passed: false, browserName, checkedAt: new Date().toISOString(), error: error.stack || String(error) }
  fs.writeFileSync(path.join(evidenceDirectory, 'react-browser-failure.json'), JSON.stringify(failure, null, 2))
  if (page) {
    try { await page.screenshot({ path: path.join(evidenceDirectory, 'react-browser-failure.png'), fullPage: true }) }
    catch { /* The original browser or assertion failure remains fatal. */ }
  }
  if (browser) await browser.close()
  console.error(error)
  process.exitCode = 1
});
