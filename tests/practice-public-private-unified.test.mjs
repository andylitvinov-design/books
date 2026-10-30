import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import ts from 'typescript'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const publicPage=read('app/[locale]/practice/page.jsx')
const showcase=read('components/practice-showcase.jsx')
const showcaseCss=read('components/practice-showcase.module.css')
const account=read('components/app/app-workspace.jsx')
const editor=read('components/app/practice-workspace.jsx')
const chrome=read('components/app/practice-dashboard.css')
const innerNav=read('components/app/practice-inner-navigation.jsx')
const server=read('app/api/app/[...path]/route.js')
const authPage=read('app/[locale]/app/[[...path]]/page.jsx')
const masterEntry=read('components/home-master-path.tsx')
const pro=read('components/profi-hub.tsx')
const proCss=read('components/profi-hub.module.css')
const middleware=read('middleware.ts')
const promo=read('components/sitewide-antistress-banner.tsx')

test('first practitioner screen is public in EN/RU/ES, never a Google gate',()=>{
 assert.match(publicPage,/SUPPORTED_LOCALES = \['en', 'ru', 'es'\]/)
 assert.match(publicPage,/return <PracticeShowcase locale=\{locale\} \/>/)
 assert.match(publicPage,/dynamic = 'force-dynamic'/)
 assert.match(publicPage,/revalidate = 0/)
 assert.match(showcase,/data-practice-showcase/)
 assert.match(showcase,/signedIn && practice \? String\(active\) : t\.countUnknown/)
 assert.match(showcase,/signedIn && practice \? String\(newRequests\) : t\.countUnknown/)
 assert.match(showcase,/if \(key === 'practice'\) \{/)
 assert.match(showcase,/\['home','masters','community'\]\.includes\(key\)/)
 assert.match(showcase,/pendingAction && !signedIn/)
 assert.doesNotMatch(showcase,/localStorage|guestMockAccount|mockClientData/)
 assert.match(showcaseCss,/@media\(max-width:354px\)/)
 assert.match(middleware,/new URL\('\/' \+ oldPractice\[1\] \+ '\/practice', request\.url\)/)
})

test('public showcase OAuth returns to reviewed dashboard without automatic private editor actions',()=>{
 const actionKeys=['create','service','session','meditation','talisman','reiki','course','material',
  'meditationList','talismanList','reikiList','courseList','clients','requests','messages',
  'services','materials','analytics','profile']
 const mapStart=server.indexOf('const PRACTICE_PREVIEW_ACTIONS = Object.freeze({')
 const mapEnd=server.indexOf('\n})',mapStart)
 assert.ok(mapStart>0&&mapEnd>mapStart)
 const fragment=server.slice(mapStart,mapEnd)
 for(const name of actionKeys)assert.ok(fragment.includes("\n  "+name+":'"),name)
 assert.match(server,/Object\.hasOwn\(PRACTICE_PREVIEW_ACTIONS,profi\)/)
 assert.equal((server.match(/validPracticeContinuation\(continueTo,profi\)/g)||[]).length,2)
 assert.match(server,/continueTo==='practice-preview'/)
 assert.match(server,/continueTo==='my-practice'/)
  // The action map is still an allowlist, not an automatic post-login redirect.
  // Browser sign-in resumes the reviewed Practice dashboard; after login the
  // user explicitly chooses a protected action, while native paths stay scoped.
  assert.match(server,/continueTo === 'practice-preview'\s*\n[\s\S]{0,300}\? `\$\{origin\}\/\$\{locale\}\/practice`/)
  assert.match(server,/const failedPracticeDestination = continueTo === 'practice-preview'\s*\? `\$\{origin\}\/\$\{locale\}\/practice`/)
  assert.doesNotMatch(server,/continueTo === 'practice-preview'\s*\n[\s\S]{0,300}\$\{PRACTICE_PREVIEW_ACTIONS\[profi\]\}/)
  // Browser OAuth returns to the reviewed dashboard, not an auto-open editor.
  // After login, the user explicitly reselects a protected action.
  assert.match(showcase,/appFetch\('auth\/start', \{ locale, continueTo:'practice-preview' \}\)/)
  assert.doesNotMatch(showcase,/continueTo:'practice-preview'\s*,\s*profi:/)
 assert.match(showcase,/router\.push\(destination\(locale, key\)\)/)
 assert.match(server,/reiki:'\/app\/practice\?panel=services&create=1&starter=reiki'/)
 assert.match(server,/diagnostic:'\/app\/practice\?panel=services&create=1&starter=diagnostic'/)
 assert.match(server,/personal:'\/app\/practice\?panel=services&create=1&starter=personal'/)
 assert.match(showcase,/setPendingAction\(start\)/)
 assert.match(showcase,/setNextAction\(start\)/)
 assert.doesNotMatch(showcase,/router\.replace\(destination\(locale, start\)\)/)
 assert.match(showcase,/data-practice-after-google/)
 assert.match(showcase,/onClick=\{continueAction\}/)
 assert.match(server,/messages:'\/app\/messages\?section=clients&tab=chats'/)
 assert.doesNotMatch(fragment,/redirectUrl|returnPath|http:\/\/|https:\/\/|clientId/)
})

test('cancelled Google sign-in returns to approved guest public screen',()=>{
 assert.match(server,/failedPracticeDestination = continueTo === 'practice-preview'/)
 assert.match(server,/\$\{origin\}\/\$\{locale\}\/practice` : destination/)
 assert.equal((server.match(/new URL\(failedPracticeDestination\)/g)||[]).length,2)
 assert.match(showcase,/t\.authCancelled/)
})

test('private panels shed old Account chrome and retain actual protected components',()=>{
 assert.match(account,/const practiceInner = page === 'practice'/)
 assert.match(account,/hh-app--practice-inner/)
 assert.match(account,/!documentReader && !practiceInner && <header className="hh-header"/)
 assert.match(account,/!documentReader && !practiceInner && page !== 'runs' && \(/)
 assert.match(account,/!documentReader && !practiceInner && page !== 'portrait'/)
 assert.match(account,/accountId=\{data\.account\.id\} key=\{data\.account\.id\} showcaseEntry/)
 assert.match(editor,/showcaseEntry=false/)
 assert.match(editor,/if\(showcaseEntry\)\{window\.location\.assign\('\/'\+locale\+'\/practice'\);return\}/)
 assert.match(editor,/data-practice-showcase-inner=\{showcaseEntry\|\|undefined\}/)
 assert.match(editor,/onBack=\{closePanel\}/)
 assert.match(editor,/<PractitionerClientProfiles items=\{requests\} services=\{services\}/)
 assert.match(editor,/<PracticeMaterials key=\{p\?\.id\|\|'materials'\}/)
 assert.match(editor,/onStatus=\{\(item,status,extra=\{\}\)=>act/)
 assert.match(chrome,/body:has\(\.hh-app--practice-inner\)/)
 assert.ok(promo.includes(String.raw`app\/practice`),'private practice banner hidden')
 assert.match(chrome,/\.hh-app\.hh-app--practice-inner/)
 assert.match(chrome,/display:none!important; \/\* Don't cover the service wizard Save\/Continue/)
 assert.match(innerNav,/const PANELS=new Set\(\['requests','clients','materials','profile','analytics','services'/)
 assert.match(innerNav,/data-practice-inner-header/)
 assert.match(innerNav,/data-practice-inner-dock/)
 assert.match(authPage,/if \(!privateEditorIntent\) redirect\('\/' \+ locale \+ '\/practice'\)/)
 assert.match(middleware,/ownerMessengerImages =/)
 assert.doesNotMatch(chrome,/\.hh-app(?!\.hh-app--practice-inner)\s*\{\s*display:none/)
})

test('entry from homepage and Pro shows the same public practitioner mock first',()=>{
 assert.match(masterEntry,/href=\{"\/" \+ locale \+ "\/practice"\}/)
 assert.match(pro,/data-profi-practice-showcase-entry/)
 assert.match(pro,/const profileHref = practiceRoot \+ "\?start=profile"/)
 assert.match(pro,/const editorHref = \(key: OfferKey\) => practiceRoot \+ "\?start=" \+ key/)
 assert.match(showcase,/PRO_STARTS\.has\(start\)/)
 assert.match(pro,/href=\{"\/"\+locale\+"\/practice"\}/)
 assert.match(proCss,/\.practiceShowcaseEntry\{/)
 assert.doesNotMatch(pro,/onClick=\{\(\)=>.*sendMessage|autoPublish:true/)
})

test('public, private and server JavaScript/TSX syntax validates',()=>{
 for(const path of ['components/practice-showcase.jsx','components/app/app-workspace.jsx',
  'components/app/practice-workspace.jsx','components/app/practice-inner-navigation.jsx',
  'components/profi-hub.tsx','components/home-master-path.tsx','app/api/app/[...path]/route.js']){
  const errors=ts.transpileModule(read(path),{
    fileName:path,reportDiagnostics:true,
    compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},
  }).diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error)||[]
  assert.deepEqual(errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[],path)
 }
})
