import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import { activeCompactNavigationId, getCompactNavigation, getSiteNavigation } from '../lib/site-navigation-model.js'
import { classifyHolisticHouseNativeAuth } from '../lib/native/deep-link-policy.js'

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8')
const page = read('app/[locale]/pro/page.tsx')
const hub = read('components/profi-hub.tsx')
const css = read('components/profi-hub.module.css')
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
  const expected=['home','energy','love','business','books','pro']
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
    find(widget.render(),'data-profi-path','practice').props.onClick()
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
  assert.match(learner,/href=\{"/" \+ locale \+ "\/pro"\}/)
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
  assert.match(hub,/role="group" aria-label=\{t.choose\}/)
  assert.match(hub,/aria-pressed=\{path === "practice"\}/)
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
