import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8')
const source = read('components/direction-offers.tsx')
const css = read('components/direction-offers.module.css')
const jsx = (type,props) => ({type,props:props||{}})
const nodes = tree => tree == null || typeof tree !== 'object' ? []
  : Array.isArray(tree) ? tree.flatMap(nodes) : [tree,...nodes(tree.props?.children)]
const by = (tree,key,value) => nodes(tree).filter(n=>n.props?.[key]===value)

const LABELS={
  sleep:{en:'Sleep quality',ru:'Качество сна',es:'Calidad del sueño'},
  fatigue:{en:'Energy and fatigue',ru:'Усталость и энергия',es:'Cansancio y energía'},
  body:{en:'Body awareness',ru:'Телесные ощущения',es:'Sensaciones corporales'},
  resources:{en:'Recovery and support',ru:'Восстановление и опора',es:'Recuperación'},
  trust:{en:'Trust and closeness',ru:'Доверие и близость',es:'Confianza'},
  boundaries:{en:'Boundaries and consent',ru:'Границы и согласие',es:'Límites y consentimiento'},
  conflict:{en:'Communication and conflict',ru:'Конфликты и общение',es:'Comunicación'},
  presence:{en:'Embodied presence',ru:'Присутствие',es:'Presencia'},
  decisions:{en:'Business decisions',ru:'Бизнес-решения',es:'Decisiones'},
  productivity:{en:'Focus and productivity',ru:'Фокус и продуктивность',es:'Productividad'},
  'work-stress':{en:'Work stress',ru:'Стресс на работе',es:'Estrés en el trabajo'},
  'money-beliefs':{en:'Money and goals',ru:'Деньги и цели',es:'Dinero y metas'},
}
function journey(direction){
  const ids=direction==='energy'?['fatigue','sleep','body','resources']
    :direction==='relationships'?['trust','boundaries','conflict','presence']
      :['decisions','productivity','work-stress','money-beliefs']
  return {id:direction,focus:[ids[0]],topics:ids.map(id=>({id,title:LABELS[id],detail:LABELS[id],focus:[id]}))}
}
function fixture(direction,locale){
  const state=[]
  let cursor=0
  const modules={
    'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:({children})=>children},
    'next/image':{__esModule:true,default:props=>jsx('img',props)},
    'next/link':{__esModule:true,default:props=>jsx('a',props)},
    'lucide-react':new Proxy({}, {get:()=>()=>null}),
    react:{useState:initial=>{const i=cursor++;if(!(i in state))state[i]=initial
      return [state[i],next=>{state[i]=typeof next==='function'?next(state[i]):next}] }},
    '@/lib/assessments/topic-journeys':{journeyFocusForTopics:(j,selected)=>
      j.topics.find(t=>t.id===selected[0])?.focus || j.focus},
    './direction-offers.module.css':{__esModule:true,default:new Proxy({}, {get:(_,key)=>String(key)})},
  }
  const code=ts.transpileModule(source,{fileName:'direction-offers.tsx',compilerOptions:{
    jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,
  }}).outputText
  const exports={}
  runInNewContext(code,{
    exports,require:name=>{assert.ok(Object.hasOwn(modules,name),'Unknown dependency: '+name);return modules[name]},
    window:{matchMedia:()=>({matches:true})},
    document:{getElementById:()=>({scrollIntoView(){}})},
  })
  const props={locale,journey:journey(direction),suggestions:{}}
  return {render:()=>{cursor=0;return exports.DirectionOffers(props)}}
}

test('the single page shows hero then filter then three separate topic-specific sections',()=>{
  for(const direction of ['energy','relationships','business']){
    for(const locale of ['en','ru','es']){
      const tree=fixture(direction,locale).render()
      assert.equal(by(tree,'data-direction-hero',true).length,1)
      assert.equal(by(tree,'data-direction-wish-form',true).length,1)
      assert.equal(by(tree,'data-direction-filter',true).length,1)
      assert.equal(by(tree,'data-direction-topic-finder',true).length,1)
      const sections=nodes(tree).filter(n=>n.props?.['data-direction-section'])
      assert.deepEqual(sections.map(n=>n.props['data-direction-section']),['test','course','session'])
      const actions=nodes(tree).filter(n=>n.props?.['data-offer-action'])
      assert.equal(actions.length,6,'initially two per test/course/service group')
      for(const kind of ['test','course','session']){
        assert.equal(by(tree,'data-offer-action',kind).length,2)
        assert.equal(by(tree,'data-direction-show-more',kind).length,1)
        assert.equal(by(tree,'data-direction-show-more',kind)[0].props['aria-expanded'],false)
        assert.equal(by(tree,'data-direction-all',kind).length,0)
      }
      assert.match(by(tree,'data-offer-action','test')[0].props.href,/\/client\/tests\?focus=/)
      const actualCourse=direction==='business'?'/'+(locale==='es'?'en':locale)+'/app/business':'/'+locale+'/courses/antistress'
      assert.equal(by(tree,'data-offer-action','course')[0].props.href,actualCourse)
      const service={energy:'alchemy-of-soul',relationships:'systemic-constellations',business:'business-consulting'}[direction]
      assert.equal(by(tree,'data-offer-action','session')[0].props.href,'/'+locale+'/services/'+service)
    }
  }
})


test('each group reveals exactly two additional real offers inline, then an external catalog link',()=>{
  for(const direction of ['energy','relationships','business']){
    for(const locale of ['en','ru','es']){
      const fixtureInstance=fixture(direction,locale)
      let tree=fixtureInstance.render()
      for(const kind of ['test','course','session']){
        const before=by(tree,'data-direction-show-more',kind)[0]
        assert.equal(before.props.type,'button','show more never navigates')
        assert.equal(before.props['aria-controls'],'hh-direction-offers-'+kind)
        before.props.onClick()
        tree=fixtureInstance.render()
        const groupActions=by(tree,'data-offer-action',kind)
        assert.equal(groupActions.length,4,kind+' must reveal exactly 2 extra items')
        assert.equal(new Set(groupActions.map(a=>a.props.href)).size,4,'each offer points to a distinct route or topic')
        assert.equal(by(tree,'data-direction-show-more',kind)[0].props['aria-expanded'],true)
        assert.equal(by(tree,'data-direction-all',kind).length,1,'catalog link appears below all four offers')
        const href=by(tree,'data-direction-all',kind)[0].props.href
        const expected={test:'/client/tests?catalog=full',course:'/academy',session:'/services'}[kind]
        assert.equal(href,'/'+locale+expected)
      }
      assert.equal(nodes(tree).filter(n=>n.props?.['data-offer-action']).length,12)
      assert.deepEqual(
        nodes(tree).filter(n=>n.props?.['data-offer-type']).map(n=>n.props['data-offer-type']),
        ['test','test','test','test','course','course','course','course','session','session','session','session'],
      )
      by(tree,'data-direction-show-more','test')[0].props.onClick()
      tree=fixtureInstance.render()
      assert.equal(by(tree,'data-offer-action','test').length,2,'collapse restores compact list')
      assert.equal(by(tree,'data-direction-all','test').length,0)
      assert.equal(by(tree,'data-offer-action','course').length,4,'expansion state is independent')
    }
  }
})

test('wishes refine client-side topic without copying personal words into URLs',()=>{
  const samples=[
    ['energy','en','I need help with sleep','sleep'],
    ['energy','ru','Мне нужен сон','sleep'],
    ['relationships','ru','Не получается говорить о границах','boundaries'],
    ['relationships','en','I struggle with conflict','conflict'],
    ['business','en','I need more income','money-beliefs'],
    ['business','es','Tengo estrés en el trabajo','work-stress'],
  ]
  for(const [direction,locale,question,expected] of samples){
    const f=fixture(direction,locale)
    let tree=f.render()
    const input=nodes(tree).find(n=>n.props?.id==='hh-direction-wish')
    input.props.onChange({target:{value:question}})
    tree=f.render()
    let prevented=false
    const inputKey=nodes(tree).find(n=>n.props?.id==='hh-direction-wish')
    inputKey.props.onKeyDown({key:'Enter',preventDefault(){prevented=true}})
    assert.ok(prevented)
    // The button uses the same local handler without a native form action.
    tree=f.render()
    assert.equal(by(tree,'data-direction-filter',true)[0].props.value,expected)
    const href=by(tree,'data-offer-action','test')[0].props.href
    assert.ok(href.includes('topics='+expected))
    assert.ok(!href.includes('wish')&&!href.includes(encodeURIComponent(question)))
  }
  assert.doesNotMatch(source,/fetch\(|sendBeacon|localStorage|sessionStorage|\/api\/service-enquiries/)
})

test('approved Services photo hero and Academy-style cards preserve mobile readability',()=>{
  assert.match(source,/onClick=\{submitWish\}/)
  assert.match(source,/onKeyDown=/)
  assert.doesNotMatch(source,/<form[^>]*data-direction-wish-form/)
  assert.doesNotMatch(source,/name="wish"/)
  assert.match(source,/data-direction-sections/)
  assert.match(source,/data-direction-section=\{kinds\[index\]\}/)
  assert.match(source,/role="status" aria-live="polite"/)
  assert.match(css,/\.hero\{[^}]*height:clamp\(405px,43vw,515px\)/s)
  assert.match(css,/\.wishForm input\{[^}]*font:500 16px/s)
  assert.match(css,/@media\(max-width:480px\)/)
  assert.match(css,/@media\(max-width:350px\)/)
  assert.match(css,/grid-template-columns:92px minmax\(0,1fr\)/)
  assert.doesNotMatch(css,/line-clamp:2|text-overflow:ellipsis/)
  assert.match(css,/:focus-visible/)
  assert.match(css,/\.offerList\{display:grid;gap:10px\}/)
  assert.match(css,/\.groupActions\{display:flex/)
  assert.match(css,/\.offerList \.card:nth-child\(n\+3\)\{animation:offerReveal/)
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{[\s\S]*?animation:none/)
  assert.match(css,/prefers-reduced-motion/)
  assert.match(source,/unoptimized priority=\{slideIndex===0\}/)
  const route=read('app/[locale]/explore/[theme]/page.tsx')
  assert.match(route,/<DirectionOffers locale=\{locale as PublicLocale\} journey=\{journey\} suggestions=\{suggestions\}\/>/)
  assert.match(route,/data-direction-more/)
})
