import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import { activeCompactNavigationId, getCompactNavigation, getSiteNavigation } from '../lib/site-navigation-model.js'
import { classifyHolisticHouseNativeAuth } from '../lib/native/deep-link-policy.js'

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8')
const page = read('app/[locale]/pro/page.tsx')
const hub = read('components/profi-hub.tsx')
const masterModule = {}
runInNewContext(ts.transpileModule(read('lib/reiki-master-programs.ts'), {
  fileName: 'reiki-master-programs.ts',
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: masterModule })

test('Pro shows one contextual free review CTA, tests and profile entries',()=>{
  assert.equal((hub.match(/<HomeFreeDiagnosisBanner /g)||[]).length,1)
  assert.match(hub,/data-profi-profiles/)
  assert.match(hub,/data-profi-entry="tests"/)
})

test('Pro TSX parses with no syntax diagnostics in all three locales',()=>{
  const source=ts.createSourceFile('components/profi-hub.tsx',hub,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
  const problems=source.parseDiagnostics.map(item=>{
    const position=source.getLineAndCharacterOfPosition(item.start||0)
    return (position.line+1)+': '+ts.flattenDiagnosticMessageText(item.messageText,' ')
  })
  assert.deepEqual(problems,[])
})
const css = read('components/profi-hub.module.css')

test('every Pro card has existing locally-hosted photography and a real action',()=>{
  const photographs=[...hub.matchAll(/"(\/images\/holistic-house\/[^"]+\.(?:webp|avif))"/g)].map(match=>match[1])
  assert.ok(photographs.length>=10)
  for(const src of new Set(photographs)){
    assert.ok(existsSync(new URL('../public'+src,import.meta.url)),'missing approved site photo '+src)
  }
  for(const locale of ['en','ru','es']){
    const widget=mount(locale)
    let view=widget.render()
    const entries=nodes(view).filter(x=>Object.hasOwn(x.props||{},'data-profi-entry'))
    assert.equal(entries.length,3)
    for(const card of entries) assert.ok(nodes(card).some(node=>typeof node.type==='function' && String(node.props?.src||'').startsWith('/images/holistic-house/')),'profile image at left')
    for(let lesson=1;lesson<=5;lesson++){
      const button=find(view,'data-profi-lesson',lesson)
      assert.ok(nodes(button).some(node=>node.type==='img' || typeof node.type==='function' && String(node.props?.src||'').startsWith('/images/holistic-house/')),'lesson image at left')
    }
    assert.ok(find(view,'data-profi-action','start-course-overview'),'direct course CTA above the fold')
    assert.equal(find(view,'data-profi-path','practice').props.href,'#profi-practice')
    for(const key of ['session','intro','workshop','course']){
      const offer=find(view,'data-profi-offer',key)
      assert.ok(nodes(offer).some(node=>typeof node.type==='function' && String(node.props?.src||'').startsWith('/images/holistic-house/')),'offer image at left: '+key)
    }
    const preview=find(view,'data-profi-preview','session')
    assert.ok(nodes(preview).some(node=>typeof node.type==='function' && String(node.props?.src||'').startsWith('/images/holistic-house/')))
    assert.equal(nodes(preview).filter(node=>node.props?.className==='fakeButton').length,0)
    assert.equal(find(view,'data-profi-action','create-service').props.prefetch,false)
  }
  assert.match(css,/\.profileEntryPhoto/)
  assert.match(css,/\.lessonThumb/)
  assert.match(css,/\.offerThumb/)
  assert.match(css,/\.publishPhoto/)
  assert.match(css,/\.previewPhoto/)
  assert.match(css,/min-height:calc\(100svh - 148px\)/)
  assert.match(css,/@media\(max-width:359px\)/)
})

const practice = read('components/app/practice-workspace.jsx')
const materials = read('components/app/practice-materials.jsx')
const editor = read('components/app/simple-service-editor.jsx')
const builder = read('components/app/practitioner-course-builder.jsx')
const auth = read('app/api/app/[...path]/route.js')
const app = read('components/app/app-workspace.jsx')

const jsx = (type,props) => typeof type === 'function' ? type(props||{}) : { type, props: props||{} }
const nodes = tree => tree == null || typeof tree !== 'object' ? [] :
  Array.isArray(tree) ? tree.flatMap(nodes) : [tree,...nodes(tree.props?.children)]
function mount(locale) {
  const state = []
  let cursor = 0
  const useState = init => {
    const i = cursor++
    if (!(i in state)) state[i] = typeof init === 'function' ? init() : init
    return [state[i], change => {
      state[i] = typeof change === 'function' ? change(state[i]) : change
    }]
  }
  const style = new Proxy({}, { get: (_,key) => String(key) })
  const modules = {
    'react/jsx-runtime': { jsx, jsxs:jsx },
    react: { useState },
    'next/link': { default:props => jsx('a',props) },
    'next/image': { default:props => jsx('img',props) },
    'lucide-react': new Proxy({}, { get: () => () => null }),
    '@/components/public-site-header': { PublicSiteHeader:props=>jsx('header',props) },
    '@/components/home-free-diagnosis-banner': { HomeFreeDiagnosisBanner:props=>jsx('aside',props) },
    './profi-hub.module.css': { __esModule:true,default:style },
    '@/lib/reiki-master-programs': masterModule,
  }
  const compiled = ts.transpileModule(hub,{
    fileName:'profi-hub.tsx',
    compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},
  }).outputText
  const exports = {}
  runInNewContext(compiled,{
    exports,
    require: name => { assert.ok(Object.hasOwn(modules,name),'known dependency: '+name);return modules[name] },
    window: { requestAnimationFrame: callback=>callback(), matchMedia:()=>({matches:true}) },
    document: { getElementById:()=>({scrollIntoView(){}}) },
  })
  return { render:()=>{cursor=0;return exports.ProfiHub({locale})} }
}
const find = (tree,attribute,value) => nodes(tree).find(x=>x.props?.[attribute]===value)

test('Pro is a real EN/RU/ES route with correct metadata and safe account fallback',()=>{
  assert.match(page,/<ProfiHub locale=\{locale\}/)
  for(const lang of ['en','ru','es']) assert.match(page,new RegExp('"/'+lang+'/pro"'))
  assert.match(page,/"x-default": "\/en\/pro"/)
  assert.match(read('lib/public-locales.ts'), /(?:en\|ru\|es).*pro/)
  for(const locale of ['en','ru','es']){
    const view=mount(locale).render()
    assert.equal(find(view,'data-profi-page',locale).type,'main')
  }
  assert.match(hub,/locale === "es" \? "en" : locale/)
})

test('bottom bar and hamburger replace Tests with Pro while keeping six usable links',()=>{
  const expected=['home','profile','coaching','insights','support','pro']
  for(const locale of ['en','ru','es']){
    const nav=getCompactNavigation(locale)
    assert.deepEqual(nav.map(x=>x.id),expected)
    assert.equal(nav.at(-1).href,'/'+locale+'/pro')
    assert.equal(getSiteNavigation(locale).find(x=>x.id==='pro')?.href,'/'+locale+'/pro')
    assert.equal(activeCompactNavigationId('/'+locale+'/pro'),'pro')
  }
  assert.match(read('components/compact-navigation-icons.ts'),/pro: GraduationCap/)
  assert.match(read('components/mobile-bottom-navigation.tsx'),/getCompactNavigation\(locale\)/)
  assert.match(read('app/ia-v2.css'),/repeat\(6,minmax\(0,1fr\)\)/)
  assert.match(read('app/holistic-house-home.css'),/repeat\(6, minmax\(0,1fr\)\)/)
})


test('Pro page contains a separate free-tests and private/personal-professional profile block',()=>{
  for(const locale of ['en','ru','es']){
    const tree=mount(locale).render()
    const entries=nodes(tree).filter(x=>x.props && Object.hasOwn(x.props,'data-profi-entry'))
    assert.deepEqual(entries.map(x=>x.props['data-profi-entry']),['tests','personal','professional'])
    const appLocale=locale==='es'?'en':locale
    assert.deepEqual(entries.map(x=>x.props.href),[
      '/'+locale+'/client/tests',
      '/'+appLocale+'/app/portrait',
      '/'+appLocale+'/app/practice?panel=profile'
    ])
    assert.ok(nodes(tree).some(x=>x.props && Object.hasOwn(x.props,'data-profi-profiles')))
    assert.ok(entries.every(x=>x.props.prefetch===false))
    assert.equal(activeCompactNavigationId('/'+locale+'/client/tests'),'pro')
  }
  assert.match(hub,/Личные результаты тестов не публикуются/)
  assert.match(css,/\.profileEntries\{display:grid/)
  assert.match(css,/@media\(max-width:600px\)/)
})

test('Pro keeps learning, practitioner offers and profiles visible in one scrollable page',()=>{
  assert.match(hub,/learnChoice: "Обучиться и стать мастером"/)
  assert.match(hub,/proChoice: "Я уже мастер — предложить услуги"/)
  assert.doesNotMatch(hub,/data-profi-active-path|path === "learn" \?|choosePath\(/)
  assert.match(css,/\.journey\[id\]\{scroll-margin-top:/)
  for (const locale of ['en','ru','es']) {
    const tree=mount(locale).render()
    const all=nodes(tree)
    const learn=all.findIndex(x=>x.props?.['data-profi-learning']!==undefined)
    const practice=all.findIndex(x=>x.props?.['data-profi-practice']!==undefined)
    const profiles=all.findIndex(x=>x.props?.['data-profi-profiles']!==undefined)
    assert.ok(learn>0 && practice>learn && profiles>practice,locale+': learn → practice → profiles')
    assert.equal(find(tree,'data-profi-path','learn').props.href,'#profi-learning')
    assert.equal(find(tree,'data-profi-path','practice').props.href,'#profi-practice')
    assert.equal(find(tree,'data-profi-path','learn').type,'a')
    assert.equal(find(tree,'data-profi-path','practice').type,'a')
    assert.equal(all.filter(x=>x.props?.['data-profi-lesson']!==undefined).length,5)
    assert.equal(all.filter(x=>x.props?.['data-profi-offer']!==undefined).length,4)
  }
})

test('actual interactive learner track explores five steps but launches only existing training',()=>{
  for(const locale of ['en','ru','es']){
    const widget=mount(locale)
    let tree=widget.render()
    assert.ok(nodes(tree).some(x=>x.props && Object.hasOwn(x.props,'data-profi-learning')))
    assert.equal(nodes(tree).filter(x=>x.props && Object.hasOwn(x.props,'data-profi-lesson')).length,5)
    find(tree,'data-profi-lesson',4).props.onClick()
    tree=widget.render()
    assert.ok(nodes(tree).some(x=>x.props?.['aria-label'] &&
      (x.props['aria-label']==='In this lesson'||x.props['aria-label']==='Что попробуешь'||x.props['aria-label']==='Qué explorarás')))
    const link=find(tree,'data-profi-action','start-course')
    assert.equal(link.props.href,'/'+(locale==='es'?'en':locale)+'/academy/principles-of-energywork/learn')
    assert.ok(nodes(tree).some(x=>x.props?.['data-profi-path']==='practice'))
  }
})

test('offer studio really switches all four starter destinations, not fake publish forms',()=>{
  const choices=[
    ['session','?panel=services&create=1&starter=session','create-service'],
    ['intro','?panel=services&create=1&starter=intro','create-service'],
    ['workshop','?panel=services&create=1&starter=workshop','create-service'],
    ['course','?panel=materials&materialTab=courses&create=1','create-course'],
  ]
  for(const locale of ['en','ru','es']){
    const widget=mount(locale)
    assert.ok(nodes(widget.render()).some(x=>Object.hasOwn(x.props||{},'data-profi-practice')))
    for(const [kind,url,action] of choices){
      let tree=widget.render()
      find(tree,'data-profi-offer',kind).props.onClick()
      tree=widget.render()
      const preview=find(tree,'data-profi-preview',kind)
      assert.ok(preview,'offer preview is selected: '+kind)
      const link=find(tree,'data-profi-action',action)
      assert.ok(link)
      assert.equal(link.props.href,'/'+(locale==='es'?'en':locale)+'/app/practice'+url)
      assert.equal(link.props['data-profi-selected-offer'],kind)
      assert.equal(nodes(tree).filter(x=>x.props && Object.hasOwn(x.props,'data-profi-step')).length,4)
      assert.ok(nodes(tree).some(x=>x.props?.['data-profi-money-model']!==undefined))
    }
  }
})

test('safe Google OAuth continuation validates and maps only categorical Pro intents',()=>{
  assert.match(app,/page === 'practice' \? \{ continueTo: 'my-practice'/)
  assert.match(app,/proPanel === 'services' && proCreate/)
  assert.match(auth,/onlyKeys\(body, \[[^\]]*'profi'\]\)/)
  assert.equal((auth.match(/continueTo !== 'my-practice' \|\| !\['session', 'intro', 'workshop', 'course', 'profile', 'requests'\]/g)||[]).length,2)
  assert.match(auth,/profi === 'course' \? '\?panel=materials&materialTab=courses&create=1'/)
  assert.match(auth,/profi === 'profile' \? '\?panel=profile'/)
  assert.match(auth,/profi === 'requests' \? '\?panel=requests'/)
  assert.match(auth,/'\?panel=services&create=1&starter=' \+ profi/)
  assert.doesNotMatch(hub,/localStorage|sessionStorage|fetch\(|createClient\(|navigator\.share/)
})

test('actual protected editors open the requested draft without saving before user confirmation',()=>{
  assert.match(practice,/params\.get\('create'\)==='1'/)
  assert.match(practice,/setNewServiceRequest\(current=>current\+1\)/)
  assert.match(practice,/setProStarter\(\['session','intro','workshop'\]\.includes/)
  assert.match(practice,/quickCreateCourse=\{proCourseStart\}/)
  assert.match(practice,/starter=\{item\?null:starter\}/)
  for(const kind of ['session','intro','workshop']) assert.match(editor,new RegExp('  '+kind+': \\{ areaKey:'))
  assert.match(editor,/!item && Object\.hasOwn\(PRO_STARTERS,starter\)/)
  assert.match(editor,/onSaveAndSubmit\(item\?\.id\|\|null,makePayload\(\),item\?\.revision\)/)
  assert.match(materials,/setCourseComposerOpen\(true\)/)
  const learner=read('components/energywork-ai-learner.tsx')
  assert.match(learner,/data-reiki-profi-continuation/)
  assert.match(learner,/href=\{"\/" \+ locale \+ "\/pro"\}/)
  assert.match(learner,/slide.kind === "finish"/)
  assert.match(materials,/startCreate=\{quickCreateCourse\}/)
  assert.match(builder,/setCreating\(Boolean\(startCreate\)\|\|!list\.length\)/)
  assert.match(builder,/data-course-quick-start/)
  assert.doesNotMatch(hub,/publishNow\(|payment_received|lead_created/)
})

test('earning promise stays honest; mobile and accessibility are deliberate',()=>{
  for(const phrase of ['Встроенные платежи и выплаты мастерам пока не работают',
    'Checkout','no earnings','No earnings','не гарантируются','до 10 сохранённых услуг Hobby']) {
    assert.ok(hub.toLowerCase().includes(phrase.toLowerCase()) || phrase==='Checkout' && hub.includes('checkout'),
      phrase)
  }
  assert.match(hub,/не даёт профессиональной квалификации/)
  assert.match(hub,/<nav className=\{styles.pathControls\} aria-label=\{t.choose\}/)
  assert.match(hub,/href="#profi-practice"/)
  assert.match(hub,/aria-pressed=\{offer === key\}/)
  assert.match(css,/@media\(max-width:359px\)/)
  assert.match(css,/@media\(max-width:600px\)/)
  assert.match(css,/prefers-reduced-motion/)
  assert.match(css,/focus-visible/)
  assert.match(css,/min-height:49px/)
})

test('native Google callback forwards safe Pro category but rejects duplicate or arbitrary query',()=>{
  const ok=classifyHolisticHouseNativeAuth('holistichouse://auth/callback?code=abc&locale=ru&continue=my-practice&profi=intro')
  assert.equal(ok.kind,'hh-auth')
  assert.match(ok.path,/\/api\/app\/auth\/callback\?/)
  assert.match(ok.path,/continue=my-practice/)
  assert.match(ok.path,/profi=intro/)
  const duplicate=classifyHolisticHouseNativeAuth('holistichouse://auth/callback?code=abc&profi=intro&profi=course')
  assert.equal(duplicate.kind,'unsupported')
  const injected=classifyHolisticHouseNativeAuth('holistichouse://auth/callback?code=abc&returnPath=https%3A%2F%2Fevil.invalid')
  assert.equal(injected.kind,'unsupported')
})

test('Pro includes the same consented express-written-review CTA as other directions', () => {
  assert.match(hub, /<HomeFreeDiagnosisBanner locale=\{locale\} context="pro"/)
  for (const locale of ['en','ru','es']) {
    const tree=mount(locale).render()
    const offers=nodes(tree).filter(node=>node.type==='aside' && node.props?.context==='pro')
    assert.equal(offers.length,1,locale+': one free written-review request')
    assert.ok(offers[0].props.locale===locale)
  }
})

test('Pro starts with three localized, accessible paths, including real mentor discovery',()=>{
  const masters = read('app/[locale]/masters/page.tsx')
  const switcher = read('components/mentor-community-switch.tsx')
  assert.match(masters,/initialView=\{requestedView === "mentors" \? "mentors" : undefined\}/)
  assert.match(switcher,/initialView \?\? \(hasArticles \? "articles" : "mentors"\)/)
  assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/)
  assert.match(css,/\.finderPhoto\{/)
  for(const locale of ['en','ru','es']){
    const tree=mount(locale).render()
    const paths=nodes(tree).filter(x=>x.props?.['data-profi-path']!==undefined)
    assert.deepEqual(paths.map(x=>x.props['data-profi-path']),['find','learn','practice'])
    assert.equal(paths[0].props.href,'/'+locale+'/masters?view=mentors')
    assert.equal(paths[0].props.prefetch,false)
    assert.equal(paths[1].props.href,'#profi-learning')
    assert.equal(paths[2].props.href,'#profi-practice')
    const finder=find(tree,'data-profi-action','find-master')
    assert.equal(finder.props.href,'/'+locale+'/masters?view=mentors')
    assert.ok(nodes(tree).some(x=>Object.hasOwn(x.props||{},'data-profi-finder')))
    assert.ok(paths.every(x=>x.type==='a' || typeof x.type==='function'))
  }
  assert.match(hub,/findChoice: "Найти мастера"/)
  assert.match(hub,/learnChoice: "Обучиться и стать мастером"/)
  assert.match(hub,/proChoice: "Я уже мастер — предложить услуги"/)
  assert.match(hub,/No earnings, number of clients or payments are guaranteed/)
})

test('Pro shows a single free introduction followed by three distinct paid master programmes in EN/RU/ES', () => {
  const expectedIds=['tantra','kundalini','yggdrasil-temple']
  assert.deepEqual(Array.from(masterModule.masterProgramIds),expectedIds)
  for(const locale of ['en','ru','es']){
    const tree=mount(locale).render()
    assert.equal(nodes(tree).find(n=>Object.hasOwn(n.props||{},'data-profi-free-course'))?.type,'details')
    assert.ok(find(tree,'data-profi-action','start-free-course'))
    const masters=nodes(tree).filter(n=>Object.hasOwn(n.props||{},'data-profi-paid-program'))
    assert.equal(masters.length,3,locale+': paid master count')
    assert.deepEqual(masters.map(n=>n.props['data-profi-paid-program']),expectedIds)
    for(const id of expectedIds){
      const item=find(tree,'data-profi-paid-program',id)
      assert.equal(item.type,'details','expandable without redirect: '+id)
      assert.equal(find(tree,'data-profi-master-link',id).props.href,'/'+locale+'/academy/reiki/master/'+id)
      assert.equal(find(tree,'data-profi-master-request',id).props.href,'/'+locale+'/academy/reiki/master/'+id+'#request')
      assert.ok(masterModule.masterReikiPrograms[id].topics[locale].length>=3)
    }
  }
  const learningIndex=hub.indexOf('id="profi-learning"')
  const paidIndex=hub.indexOf('id="profi-masters"')
  const practiceIndex=hub.indexOf('id="profi-practice"')
  assert.ok(learningIndex<paidIndex&&paidIndex<practiceIndex)
  assert.match(css,/\.masterCards\{display:grid/)
  assert.match(css,/@media\(max-width:430px\)/)
  assert.match(css,/@media\(max-width:359px\)/)
})

test('master landings have localized independent URLs and use verified lead intake rather than checkout', () => {
  const route=read('app/[locale]/academy/reiki/master/[program]/page.tsx')
  const layout=read('app/[locale]/academy/reiki/master/[program]/master-reiki.module.css')
  const model=read('lib/reiki-master-programs.ts')
  for(const path of [ 'components/profi-hub.tsx', 'app/[locale]/academy/reiki/master/[program]/page.tsx', 'lib/reiki-master-programs.ts' ]){
    const text=read(path)
    const node=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS)
    assert.equal(node.parseDiagnostics.length,0,path+': parse diagnostics')
  }
  assert.match(route,/<ContactChannelChooser/)
  assert.match(route,/stayAfterSave/)
  assert.match(route,/whatsappEnquiryUrl\(/)
  assert.match(route,/pagePath: path/)
  assert.match(route,/masterProgramIds\.some/)
  assert.match(route,/id="request"/)
  assert.match(route,/canonical:/)
  assert.match(route,/"x-default"/)
  assert.match(route,/data-reiki-master-landing=\{program\}/)
  assert.match(model,/price to consult|fee on request/i)
  assert.doesNotMatch(route,/stripe|checkout|createOrder|paymentIntent/i)
  assert.match(layout,/@media\(max-width:430px\)/)
  assert.match(layout,/\.heroArt\{position:relative;/)
  for(const entry of Object.values(masterModule.masterReikiPrograms)){
    assert.ok(entry.title.en && entry.title.ru && entry.title.es)
    assert.ok(entry.academyPath.startsWith('reiki/'))
  }
})
