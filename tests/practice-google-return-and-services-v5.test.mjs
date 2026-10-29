import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const callback=read('app/api/app/[...path]/route.js')
const front=read('components/practice-showcase.jsx')
const frontCss=read('components/practice-showcase.module.css')
const service=read('components/app/my-services-dashboard.jsx')
const serviceCss=read('components/app/my-services-dashboard.module.css')
const practice=read('components/app/practice-workspace.jsx')
const account=read('components/app/app-workspace.jsx')
const innerNav=read('components/app/practice-inner-navigation.jsx')

test('Google login returns to the very same practitioner dashboard and identical five-tab menu',()=>{
 assert.match(callback,/continueTo === 'practice-preview'/)
 assert.match(callback,/\$\{origin\}\/\$\{locale\}\/practice\$\{profi && Object\.hasOwn/)
 assert.match(callback,/'\?ready='\+encodeURIComponent\(profi\)/)
 assert.doesNotMatch(callback,/\$\{origin\}\/\$\{locale==='es'\?'en':locale\}\$\{PRACTICE_PREVIEW_ACTIONS\[profi\]\}/)
 assert.match(front,/data-practice-showcase/)
 assert.match(front,/data-practice-after-google/)
 assert.match(front,/setNextAction\(ready\)/)
 assert.match(front,/RESUMABLE_ACTIONS\.has\(ready\)/)
 assert.match(front,/onClick=\{continueAction\}/)
 assert.match(front,/onClick=\{dismissContinue\}/)
 assert.match(front,/return <div className=\{styles\.screen\} data-practice-showcase/)
 assert.match(front,/TABS\.map\(/)
 assert.doesNotMatch(front,/router\.replace\(destination\(locale, start\)\)/)
 assert.match(frontCss,/\.resumePanel\{/)
 assert.match(frontCss,/@media\(max-width:430px\)/)
})

test('Pro action is remembered without automatic navigation; same design remains after sign-in',()=>{
 assert.match(front,/if \(!signedIn\) return/)
 assert.match(front,/setNextAction\(start\)/)
 assert.match(front,/PRO_STARTS\.has\(start\)/)
 assert.match(front,/setPendingAction\(''\)/)
 assert.match(front,/async function confirmSignIn\(\)/)
 assert.match(front,/appFetch\('auth\/start', \{ locale, continueTo:'practice-preview', profi:key \}\)/)
 assert.match(front,/setSession\('signed'\)/)
 assert.match(front,/setNextAction\(key\)/)
 assert.doesNotMatch(front,/localStorage|sessionStorage|fakePracticeAccount|mockServiceCount/)
 assert.match(front,/signedIn && practice \? String\(active\) : t\.countUnknown/)
})

test('service list uses one inner header, real totals, functional filters, existing editor',()=>{
 assert.match(account,/practiceInner \? 'hh-app hh-app--practice-inner'/)
 assert.match(practice,/<PracticeInnerHeader locale=\{locale\} panel=\{activePanel\}/)
 assert.match(practice,/<PracticeInnerBottomNavigation locale=\{locale\} panel=\{activePanel\}/)
 assert.match(service,/data-practice-services-new-design/)
 assert.doesNotMatch(service,/<header className=\{styles\.header\} data-composing=\{composing\}/)
 assert.match(service,/const published=items\.filter\(item=>item\.status==='published'\)\.length/)
 assert.match(service,/const reviewing=items\.filter/)
 assert.match(service,/filterPracticeServices\(items,\{query,status,area,format,price\}\)/)
 assert.match(service,/data-practice-service-status-tabs/)
 assert.match(service,/aria-pressed=\{status===entry\.key\}/)
 assert.match(service,/onClick=\{\(\)=>setStatus\(entry\.key\)\}/)
 assert.match(service,/visible\.map\(item=>\{/)
 assert.match(service,/<\/details>\}\)\}\s*<\/div>\}/)
 assert.match(service,/item\.localizedCopy\?\.\[lang\]\?\.title/)
 assert.match(service,/data-status=\{item\.status\}/)
 assert.match(service,/onToggle=\{event=>\{if\(event\.currentTarget\.open\)/)
 assert.match(service,/renderEditor\(null,setCreateDirty,setMediaBusy\)/)
 assert.match(service,/renderEditor\(editingItem,setEditDirty,setMediaBusy\)/)
 assert.match(serviceCss,/\.dashboard\[data-practice-services-new-design\]/)
 assert.match(serviceCss,/\.serviceIcon\[data-service-kind="reiki"\]/)
 assert.match(serviceCss,/\.statusTabs button\[aria-pressed=true\]/)
 assert.match(serviceCss,/@media\(max-width:350px\)/)
 assert.match(serviceCss,/:has\(\[data-service-composer-focus\]\)/)
 assert.doesNotMatch(service,/fakePayment|new SupabaseClient|createServiceForGuest/)
})

test('web Google sign-in returns to original Practice, with editor only after explicit Continue',()=>{
 assert.match(account,/const publicPracticeAction = proPanel === 'services'/)
 assert.match(account,/native\s*\? \{ continueTo: 'my-practice'/)
 assert.match(account,/continueTo: 'practice-preview', \.\.\.\(publicPracticeAction \?/)
 assert.match(account,/\['diagnostic','energy','personal','reiki'\]\.includes\(proStarter\)/)
 assert.match(account,/\['clients','requests','analytics','profile'\]\.includes\(proPanel\)/)
 assert.match(front,/data-practice-after-google/)
 assert.match(front,/onClick=\{continueAction\}/)
 assert.doesNotMatch(front,/router\.replace\(destination\(locale, ready\)\)/)
 assert.match(callback,/continueTo === 'practice-preview'/)
 assert.match(callback,/'\?ready='\+encodeURIComponent\(profi\)/)
})

test('viewing an empty My Services does not open the wizard without an explicit create request',()=>{
 assert.match(service,/const \[creating,setCreating\]=useState\(false\)/)
 assert.doesNotMatch(service,/useState\(items\.length===0&&canAdd\)/)
 assert.match(service,/if\(createRequest>0&&canAdd\)setCreating\(true\)/)
 assert.match(service,/onClick=\{toggleComposer\}/)
 assert.match(service,/items\.length===0&&!creating&&canAdd/)
 assert.match(service,/renderEditor\(null,setCreateDirty,setMediaBusy\)/)
 assert.match(innerNav,/data-practice-original-home-link/)
 assert.match(innerNav,/showcaseStyles\.eyebrow/)
 assert.match(innerNav,/href=\{'\/'\+locale\+'\/practice'\}/)
 for(const label of ['Кабинет практика','Practitioner workspace','Espacio profesional'])
   assert.ok(innerNav.includes(label),label)
})

test('strict OAuth whitelist remains server-side and preserves cancel-to-guest behavior',()=>{
 assert.match(callback,/validPracticeContinuation\(continueTo,profi\)/)
 assert.match(callback,/Object\.hasOwn\(PRACTICE_PREVIEW_ACTIONS,profi\)/)
 assert.match(callback,/failedPracticeDestination = continueTo === 'practice-preview'/)
 assert.equal((callback.match(/new URL\(failedPracticeDestination\)/g)||[]).length,2)
 assert.match(callback,/returnPath !== null/)
 assert.match(callback,/requireSameOrigin\(request, config\)/)
 assert.match(callback,/PRIVATE_HEADERS/)
 for(const key of ['reiki','services','requests','clients','materials','messages','analytics','profile']){
  assert.ok(callback.includes(key+":'/app/"),key)
 }
})

test('JSX, TypeScript and callback syntax parse at the actual release gate',()=>{
 for(const path of ['components/practice-showcase.jsx',
   'components/app/my-services-dashboard.jsx','components/app/practice-workspace.jsx',
   'components/app/app-workspace.jsx','components/app/practice-inner-navigation.jsx',
   'app/api/app/[...path]/route.js']){
  const result=ts.transpileModule(read(path),{fileName:path,reportDiagnostics:true,
    compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}})
  const errors=(result.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error)
  assert.deepEqual(errors.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')),[],path)
 }
})
