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

test('Pro cards keep photos left, inline pills, and accessible 320px actions',()=>{
  const cardCss=css.slice(css.indexOf('/* 2026-10-25: same photo-left'))
  assert.ok(cardCss.length>1500,'current photo-left Pro skin should be present')
  assert.match(cardCss,/\.offerGrid\{\s*display:grid;grid-template-columns:1fr/)
  assert.match(cardCss,/\.offerOptionHeader\{display:contents\}/)
  assert.match(cardCss,/\.offerOptionHeader \.offerThumb\{\s*grid-column:1;grid-row:1\/span 2/)
  assert.match(cardCss,/\.offerActions\{\s*grid-column:2;grid-row:2;display:grid/)
  assert.match(cardCss,/\.offerExpanded\{\s*grid-column:1\/-1;grid-row:3/)
  assert.match(cardCss,/border-radius:999px/)
  assert.match(cardCss,/@media\(max-width:600px\)/)
  assert.match(cardCss,/@media\(max-width:359px\)/)
  assert.match(cardCss,/min-height:44px/)
  for(const locale of ['en','ru','es']){
    const view=mount(locale).render()
    for(const key of ['diagnostic','energy','meditation','personal']){
      const card=find(view,'data-profi-offer',key)
      assert.equal(find(card,'data-profi-offer-details',key).props['aria-expanded'],false)
      assert.ok(find(card,'data-profi-selected-offer',key).props.href.includes('/app/practice?'))
    }
  }
})

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
    for(const card of entries) assert.ok(nodes(card).some(node=>node.type==='img' && String(node.props?.src||'').startsWith('/images/holistic-house/')),'profile image at left')
    for(let lesson=1;lesson<=5;lesson++){
      const button=find(view,'data-profi-lesson',lesson)
      assert.ok(nodes(button).some(node=>node.type==='img' || node.type==='img' && String(node.props?.src||'').startsWith('/images/holistic-house/')),'lesson image at left')
    }
    assert.ok(find(view,'data-profi-action','start-course-overview'),'direct course CTA above the fold')
    assert.equal(find(view,'data-profi-path','practice').props.href,'#profi-practice')
    for(const key of ['diagnostic','energy','meditation','personal']){
      const offer=find(view,'data-profi-offer',key)
      assert.ok(nodes(offer).some(node=>node.type==='img' && String(node.props?.src||'').startsWith('/images/holistic-house/')),'offer image at left: '+key)
    }
    assert.equal(nodes(view).filter(node=>node.props?.['data-profi-preview']!==undefined).length,0)
    for(const key of ['diagnostic','energy','meditation','personal']){
      const option=find(view,'data-profi-offer',key)
      const details=find(option,'data-profi-offer-details',key)
      const create=find(option,'data-profi-selected-offer',key)
      assert.equal(details.props['aria-expanded'],false)
      assert.equal(create.props.prefetch,false)
      assert.equal(create.type,'a')
    }
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
    'next/link': { __esModule:true,default:props => jsx('a',props) },
    'next/image': { __esModule:true,default:props => jsx('img',props) },
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

test('bottom bar uses the seven established EN/RU/ES links and keeps Pro next to Holistic Support',()=>{
  const expected=['profile','courses','home','analysis','alchemy','pro','temple']
  for(const locale of ['en','ru','es']){
    const nav=getCompactNavigation(locale)
    assert.deepEqual(nav.map(x=>x.id),expected)
    assert.equal(nav.at(-2).href,'/'+locale+'/pro')
    assert.equal(nav.at(-1).href,'/'+locale+'/holistic-support')
    assert.equal(getSiteNavigation(locale).find(x=>x.id==='pro')?.href,'/'+locale+'/pro')
    assert.equal(activeCompactNavigationId('/'+locale+'/pro'),'pro')
  }
  assert.match(read('components/compact-navigation-icons.ts'),/pro: GraduationCap/)
  assert.match(read('components/compact-navigation-icons.ts'),/temple: Landmark/)
  assert.match(read('components/mobile-bottom-navigation.tsx'),/getCompactNavigation\(locale\)/)
  assert.match(read('app/ia-v2.css'),/repeat\(7,minmax\(0,1fr\)\)/)
  assert.match(read('app/holistic-house-home.css'),/repeat\(7, minmax\(0,1fr\)\)/)
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
    assert.equal(activeCompactNavigationId('/'+locale+'/client/tests'),'profile')
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

test('Pro does not show the redundant Learn / Develop / Share roadmap in EN, RU or ES',()=>{
  assert.doesNotMatch(hub,/profi-after-learning|styles\.nextStage|t\.afterTitle|t\.after\.map|data-profi-action="advanced-reiki"/)
  for(const text of ['How to move from learning to practice','Как перейти от учёбы к практике','De aprender a ejercer']){
    assert.ok(!hub.includes(text),'obsolete roadmap copy: '+text)
  }
  for(const locale of ['en','ru','es']){
    const tree=mount(locale).render()
    assert.equal(nodes(tree).filter(node=>node.props?.id==='profi-after-learning').length,0,locale)
    assert.ok(nodes(tree).some(node=>Object.hasOwn(node.props||{},'data-profi-learning')),locale+': learning path retained')
    assert.ok(nodes(tree).some(node=>Object.hasOwn(node.props||{},'data-profi-practice')),locale+': practitioner offers retained')
    assert.equal(nodes(tree).filter(node=>node.props?.['data-profi-paid-program']!==undefined).length,3,locale+': advanced training remains available')
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

test('all four Pro offers link directly to the right existing editor; Details expands in place',()=>{
  const choices=[
    ['diagnostic','?panel=services&create=1&starter=diagnostic','create-service'],
    ['energy','?panel=services&create=1&starter=energy','create-service'],
    ['meditation','?panel=materials&materialTab=courses&create=1','create-course'],
    ['personal','?panel=services&create=1&starter=personal','create-service'],
  ]
  for(const locale of ['en','ru','es']){
    const widget=mount(locale)
    const root='/'+(locale==='es'?'en':locale)+'/app/practice'
    for(const [kind,url,action] of choices){
      let tree=widget.render()
      let card=find(tree,'data-profi-offer',kind)
      let details=find(card,'data-profi-offer-details',kind)
      const create=find(card,'data-profi-selected-offer',kind)
      assert.equal(create.props.href,root+url)
      assert.equal(create.props['data-profi-action'],action)
      assert.equal(create.props.prefetch,false)
      assert.equal(details.props['aria-expanded'],false)
      assert.equal(find(card,'data-profi-offer-expanded',kind).props.hidden,true)
      details.props.onClick()
      tree=widget.render()
      card=find(tree,'data-profi-offer',kind)
      details=find(card,'data-profi-offer-details',kind)
      assert.equal(details.props['aria-expanded'],true)
      assert.equal(find(card,'data-profi-offer-expanded',kind).props.hidden,false)
      assert.equal(nodes(tree).filter(x=>x.props?.['data-profi-preview']!==undefined).length,0)
      assert.equal(nodes(tree).filter(x=>x.props?.['data-profi-step']!==undefined).length,0)
      details.props.onClick()
    }
    assert.ok(nodes(widget.render()).some(x=>x.props?.['data-profi-money-model']!==undefined))
  }
})

test('Master offer choices are localized, non-medical, and backed by approved service types',()=>{
  const labels={
    en:['Personal diagnostics','Energy support','Create a meditation course','Personal service'],
    ru:['Персональная диагностика','Энергетическая поддержка','Создать онлайн-курс медитации','Персональная услуга'],
    es:['Diagnóstico personal','Apoyo energético','Crear un curso de meditación','Servicio personal'],
  }
  const keys=['diagnostic','energy','meditation','personal']
  for(const locale of ['en','ru','es']){
    const view=mount(locale).render()
    keys.forEach((key,index)=>{
      const option=find(view,'data-profi-offer',key)
      assert.ok(JSON.stringify(option).includes(labels[locale][index]),locale+': '+key)
      assert.equal(option.type,'article')
      assert.equal(find(option,'data-profi-offer-details',key).props.type,'button')
      assert.equal(find(option,'data-profi-selected-offer',key).type,'a')
    })
  }
  assert.match(editor,/diagnostic: \{ areaKey:'personal_development', offeringType:'assessment'/)
  assert.match(editor,/energy: \{ areaKey:'energy_spiritual', offeringType:'session'/)
  assert.match(editor,/personal: \{ areaKey:'personal_development', offeringType:'session'/)
  assert.match(hub,/not a medical diagnosis or treatment/)
  assert.match(hub,/Это не медицинский диагноз или лечение/)
  assert.match(hub,/No es un diagnóstico ni un tratamiento médico/)
})

test('safe Google OAuth continuation validates and maps only categorical Pro intents',()=>{
  assert.match(app,/page === 'practice' \? \{ continueTo: 'my-practice'/)
  assert.match(app,/proPanel === 'services' && proCreate/)
  assert.match(auth,/onlyKeys\(body, \[[^\]]*'profi'[^\]]*\]\)/)
  assert.equal((auth.match(/continueTo !== 'my-practice' \|\| !\['session', 'intro', 'workshop', 'diagnostic', 'energy', 'personal', 'course', 'profile', 'requests'\]/g)||[]).length,2)
  assert.match(auth,/profi === 'course' \? '\?panel=materials&materialTab=courses&create=1'/)
  assert.match(auth,/profi === 'profile' \? '\?panel=profile'/)
  assert.match(auth,/profi === 'requests' \? '\?panel=requests'/)
  assert.match(auth,/'\?panel=services&create=1&starter=' \+ profi/)
  assert.doesNotMatch(hub,/localStorage|sessionStorage|fetch\(|createClient\(|navigator\.share/)
})

test('actual protected editors open the requested draft without saving before user confirmation',()=>{
  assert.match(practice,/params\.get\('create'\)==='1'/)
  assert.match(practice,/setNewServiceRequest\(current=>current\+1\)/)
  assert.match(practice,/setProStarter\(\['session','intro','workshop','diagnostic','energy','personal'\]\.includes/)
  assert.match(practice,/quickCreateCourse=\{proCourseStart\}/)
  assert.match(practice,/starter=\{item\?null:starter\}/)
  for(const kind of ['diagnostic','energy','personal']) assert.match(editor,new RegExp('  '+kind+': \\{ areaKey:'))
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
  assert.match(hub,/Pricing, qualifications and legal eligibility are your responsibility/)
  assert.match(hub,/<nav className=\{styles.pathControls\} aria-label=\{t.choose\}/)
  assert.match(hub,/href="#profi-practice"/)
  assert.match(hub,/aria-expanded=\{isExpanded\}/)
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

test('Pro starts with three localized, accessible paths, including real mentor discovery',async()=>{
  const masters = read('app/[locale]/masters/page.tsx')
  const switcher = read('components/mentor-community-switch.tsx')
  // Exercise existing merged PR1933 behavior, not an assumed owner default.
  // Repositories are finite synthetic boundaries; no real DB modules are loaded.
  const element = (type, props) => ({type, props: props || {}})
  const compile = (source, fileName, modules) => {
    const exports = {}
    const denied = () => { throw new Error('Unexpected external call in mentor view regression') }
    runInNewContext(ts.transpileModule(source, {fileName,
      compilerOptions: {jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},
    }).outputText, {exports, require:name=>{
      assert.ok(Object.hasOwn(modules,name),'known mocked dependency: '+name)
      return modules[name]
    }, fetch:denied, window:new Proxy({}, {get:denied}), document:new Proxy({}, {get:denied})}, {timeout:1000})
    return exports
  }
  const jsxRuntime = {jsx:element,jsxs:element,Fragment:'fragment'}
  const modules = {
    'react/jsx-runtime':jsxRuntime,
    'next/navigation':{notFound:()=>{throw new Error('Unexpected locale')}},
    '@/components/public-site-header':{PublicSiteHeader:'header'},
    '@/data/academy/catalog':{isPublicLocale:locale=>['en','ru','es'].includes(locale)},
    '@/data/site-metadata':{metadataBaseFor:()=>{throw new Error('Metadata outside regression')}},
    '@/lib/app/config':{getAppConfig:()=>Object.freeze({synthetic:true})},
    '@/lib/practitioners/repository':{createPractitionerRepository:()=>({listPublicPractitioners:async()=>[]})},
    '@/lib/practitioners/article-repository':{createArticleRepository:()=>({publicList:async()=>[]})},
    '@/lib/practitioners/course-repository':{createPractitionerCourseRepository:()=>({catalog:async()=>[]})},
    '@/components/master-network-explorer':{MarketplaceMasterFinder:'finder'},
    '@/components/practitioner-article-directory':{ArticleDirectory:'article-directory'},
    '@/components/mentor-community-switch':{MentorCommunitySwitch:'community-switch'},
    '@/components/community-service-highlights':{CommunityServiceHighlights:'service-highlights'},
  }
  const route = compile(masters,'masters-page.tsx',modules).default
  const renderSwitch = props => {
    const component = compile(switcher,'mentor-community-switch.tsx',{
      'react/jsx-runtime':jsxRuntime,
      react:{useState:initial=>[initial,()=>{throw new Error('No interaction expected')}],useRef:()=>({current:null}),useEffect:()=>{}},
      'next/link':{__esModule:true,default:'a'},
      './mentor-community-switch.module.css':{__esModule:true,default:new Proxy({}, {get:(_,key)=>String(key)})},
    }).MentorCommunitySwitch
    return component(props)
  }
  for (const locale of ['en','ru','es']) {
    for (const requested of [undefined,'mentors','articles','invalid',['articles']]) {
      const tree = await route({params:Promise.resolve({locale}),searchParams:Promise.resolve({view:requested})})
      const props = nodes(tree).find(node=>node.type==='community-switch').props
      const expected = requested === 'articles' ? 'articles' : 'mentors'
      assert.equal(props.initialView,expected,locale+': route view '+String(requested))
      for (const populated of [false,true]) {
        const rendered = renderSwitch({...props,hasArticles:populated,hasServices:populated})
        const tabs = nodes(rendered).filter(node=>node.props?.role==='tab')
        assert.equal(tabs.length,2)
        for (const tab of tabs) {
          const active = tab.props.id === 'mentor-community-tab-'+expected
          assert.equal(tab.props['aria-selected'],active)
          assert.equal(tab.props.tabIndex,active?0:-1)
          const panel = nodes(rendered).find(node=>node.props?.id===tab.props['aria-controls'])
          assert.equal(panel.props.hidden,!active)
          assert.equal(panel.props['aria-labelledby'],tab.props.id)
        }
      }
    }
    // Direct component consumers without initialView retain the merged default,
    // including when published content exists; explicit articles remains usable.
    for (const populated of [false,true]) {
      const rendered = renderSwitch({locale,mentors:'synthetic mentors',articles:'synthetic articles',hasArticles:populated,hasServices:populated})
      assert.equal(nodes(rendered).find(node=>node.props?.id==='mentor-community-tab-mentors').props['aria-selected'],true)
      assert.equal(nodes(rendered).find(node=>node.props?.id==='mentor-community-panel-articles').props.hidden,true)
    }
  }
  assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/)
  assert.match(css,/\.finderPhoto\{/)
  for(const locale of ['en','ru','es']){
    const tree=mount(locale).render()
    const paths=nodes(tree).filter(x=>x.props?.['data-profi-path']!==undefined)
    assert.deepEqual(paths.map(x=>x.props['data-profi-path']),['find','learn','practice'])
    assert.equal(paths[0].props.href,'#profi-find-master')
    assert.equal(paths[0].props.prefetch,false)
    assert.equal(paths[1].props.href,'#profi-learning')
    assert.equal(paths[2].props.href,'#profi-practice')
    const finder=find(tree,'data-profi-action','find-master')
    assert.equal(finder.props.href,'/'+locale+'/masters?view=mentors')
    assert.ok(nodes(tree).some(x=>Object.hasOwn(x.props||{},'data-profi-finder')))
    assert.ok(paths.every(x=>x.type==='a' || typeof x.type==='function'))
  }
  assert.match(hub,/data-profi-master-directory/)
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
