import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import * as businessReviewContext from '../lib/business-consulting/review-context.js'

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
function fixture(direction,locale,suggestions={}){
  const state=[]
  let cursor=0
  const modules={
    'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:({children})=>children},
    '@/lib/business-consulting/review-context':businessReviewContext,
    'next/image':{__esModule:true,default:props=>jsx('img',props)},
    'next/link':{__esModule:true,default:props=>jsx('a',props)},
    '@/components/home-free-diagnosis-banner':{HomeFreeDiagnosisBanner:props=>jsx('aside',props)},
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
  const props={locale,journey:journey(direction),suggestions}
  return {render:()=>{cursor=0;return exports.DirectionOffers(props)}}
}

test('the single page shows hero then filter then three separate topic-specific sections',()=>{
  for(const direction of ['energy','relationships','business']){
    for(const locale of ['en','ru','es']){
      const tree=fixture(direction,locale).render()
      assert.equal(by(tree,'data-direction-hero',true).length,1)
      assert.equal(by(tree,'data-direction-wish-form',true).length,1)
      assert.equal(by(tree,'data-direction-filter','all').length,1)
      assert.equal(nodes(tree).filter(n=>n.type==='select').length,0)
      assert.equal(nodes(tree).filter(n=>n.props?.['data-direction-filter']).length,5)
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
      const actualCourse=direction==='business'?'/'+locale+'/coaching':'/'+locale+'/courses/antistress'
      assert.equal(by(tree,'data-offer-action','course')[0].props.href,actualCourse)
      const service={energy:'alchemy-of-soul',relationships:'systemic-constellations',business:'business-consulting'}[direction]
      assert.equal(by(tree,'data-offer-action','session')[0].props.href,'/'+locale+'/services/'+service)
    }
  }
})

test('all suggested free-test cards open their exact guest questionnaire without a second picker',()=>{
  const keys=['hh-current-state','phq-4','mini-ipip-20','who-5','phq-9']
  for(const direction of ['energy','relationships','business']){
    for(const locale of ['en','ru','es']){
      const ids=journey(direction).topics.map(item=>item.id)
      const suggestions=Object.fromEntries([
        ['', [{key:keys[0],title:'Weekly Wellbeing Check-in'}]],
        ...ids.map((id,i)=>[id,[{key:keys[i+1],title:'Suggested questionnaire'}]]),
      ])
      const f=fixture(direction,locale,suggestions)
      const runnerLocale=locale==='es'?'en':locale
      const hrefFor=key=>'/'+runnerLocale+'/client?startTests='+key
      let tree=f.render()
      assert.equal(by(tree,'data-offer-action','test')[0].props.href,hrefFor(keys[0]))
      assert.equal(by(tree,'data-offer-action','test')[1].props.href,hrefFor(keys[1]))
      by(tree,'data-direction-show-more','test')[0].props.onClick()
      tree=f.render()
      const cards=by(tree,'data-offer-action','test')
      assert.deepEqual(cards.map(item=>item.props.href),keys.slice(0,4).map(hrefFor))
      for(const card of cards){
        assert.deepEqual([...new URL(card.props.href,'https://example.invalid').searchParams.keys()],['startTests'])
        assert.ok(!card.props.href.includes('/client/tests?'))
      }
      assert.equal(by(tree,'data-direction-all','test')[0].props.href,'/'+locale+'/client/tests?catalog=full')
      by(tree,'data-direction-filter',ids[3])[0].props.onClick()
      tree=f.render()
      assert.equal(by(tree,'data-offer-action','test')[0].props.href,hrefFor(keys[4]))
    }
  }
  const runner=read('components/app/cabinet-landing.jsx')
  assert.ok(runner.includes("requestedGuestTests = searchParams.get('startTests')"))
  assert.ok(runner.includes('if (definitions.length === 1)'))
  assert.ok(runner.includes('return begin(definitions[0].key)'))
})

test('visible cards prefer different guest tests when topic suggestions overlap',()=>{
  for(const direction of ['energy','relationships','business']){
    for(const locale of ['en','ru','es']){
      const ids=journey(direction).topics.map(topic=>topic.id)
      const primary={key:'hh-monthly-profile',title:'Monthly Life Profile'}
      const second={key:'hh-resource-pulse',title:'Resources & Inner Support'}
      const suggestions=Object.fromEntries([['',[primary,second]],...ids.map(id=>[id,[primary,second]])])
      const runnerLocale=locale==='es'?'en':locale
      const f=fixture(direction,locale,suggestions)
      let tree=f.render()
      const hrefs=by(tree,'data-offer-action','test').map(link=>link.props.href)
      assert.equal(hrefs[0],'/'+runnerLocale+'/client?startTests=hh-monthly-profile')
      assert.equal(hrefs[1],'/'+runnerLocale+'/client?startTests=hh-resource-pulse')
      by(tree,'data-direction-filter',ids[1])[0].props.onClick()
      tree=f.render()
      const narrowed=by(tree,'data-offer-action','test').map(link=>link.props.href)
      assert.equal(narrowed[0],'/'+runnerLocale+'/client?startTests=hh-monthly-profile')
      assert.equal(narrowed[1],'/'+runnerLocale+'/client?startTests=hh-resource-pulse')
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
        const expected={test:'/client/tests?catalog=full',course:'/academy',session:'/services/catalog#service-listings'}[kind]
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
    assert.equal(by(tree,'data-direction-filter',expected)[0].props['aria-pressed'],true)
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
  assert.match(css,/\.topicChips\{[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/s)
  assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.doesNotMatch(css,/overflow-x:auto/)
  assert.doesNotMatch(source,/<select\b|scrollIntoView\(/)
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
  assert.match(route,/<DirectionExtras locale=\{locale as PublicLocale\}/)
})

test('action filter is one compact, accessible row at 320–430px in every locale',()=>{
  const full={
    en:['Take a test','Get advice','Take a course','Get a consultation'],
    ru:['Пройти тест','Получить совет','Пройти курс','Получить консультацию'],
    es:['Hacer un test','Recibir orientación','Hacer un curso','Solicitar una consulta'],
  }
  const short={
    en:['Test','Advice','Course','Consult'],
    ru:['Тест','Совет','Курс','Сессия'],
    es:['Test','Consejo','Curso','Consulta'],
  }
  for(const direction of ['energy','relationships','business']){
    for(const locale of ['en','ru','es']){
      const tree=fixture(direction,locale).render()
      const buttons=nodes(tree).filter(n=>n.props?.['data-direction-intent'])
      assert.equal(buttons.length,4)
      assert.deepEqual(buttons.map(n=>n.props['aria-label']),full[locale])
      for(let i=0;i<4;i++){
        const spans=nodes(buttons[i]).filter(n=>n.type==='span')
        assert.equal(spans.find(n=>n.props.className==='actionShort')?.props.children,short[locale][i])
        assert.equal(spans.find(n=>n.props.className==='actionShort')?.props['aria-hidden'],'true')
        assert.equal(spans.find(n=>n.props.className==='actionFull')?.props.children,full[locale][i])
      }
    }
  }
  assert.match(css,/@media\(max-width:1050px\)\{\.actionChip \.actionFull\{display:none\}\.actionChip \.actionShort\{display:inline\}\}/)
  assert.match(css,/@media\(max-width:780px\)\{[\s\S]*?\.actionChips\{flex:1 1 100%\}/)
  assert.match(css,/@media\(max-width:480px\)\{[\s\S]*?\.actionChip\{min-height:44px;padding:7px 3px;border-radius:10px;font-size:11px\}/)
  assert.match(css,/@media\(max-width:350px\)\{[\s\S]*?\.actionChip\{padding-inline:2px;font-size:10.5px\}/)
  assert.match(css,/\.actionChip\{[^}]*white-space:nowrap\}/)
  assert.doesNotMatch(css,/\.actionChips\{[^}]*repeat\(2,minmax\(0,1fr\)\)/)
})

test('four topic requests are always visible as localized accessible buttons with a stable reset',()=>{
  for(const direction of ['energy','relationships','business']){
    for(const locale of ['en','ru','es']){
      const f=fixture(direction,locale)
      let tree=f.render()
      const ids=journey(direction).topics.map(topic=>topic.id)
      const controls=nodes(tree).filter(n=>n.props?.['data-direction-filter'])
      assert.deepEqual(controls.map(n=>n.props['data-direction-filter']),['all',...ids])
      assert.ok(controls.every(n=>n.type==='button'))
      assert.equal(controls[0].props['aria-pressed'],true)
      assert.ok(controls.slice(1).every(n=>n.props['aria-pressed']===false))
      assert.ok(controls.slice(1).every(n=>typeof n.props['aria-label']==='string'))
      // Clicking a topic updates the real test handoff without a menu or scroll.
      controls[2].props.onClick()
      tree=f.render()
      assert.equal(by(tree,'data-direction-filter',ids[1])[0].props['aria-pressed'],true)
      assert.ok(by(tree,'data-offer-action','test')[0].props.href.includes('topics='+ids[1]))
      by(tree,'data-direction-filter','all')[0].props.onClick()
      tree=f.render()
      assert.equal(by(tree,'data-direction-filter','all')[0].props['aria-pressed'],true)
      assert.ok(by(tree,'data-offer-action','test')[0].props.href.endsWith('topics='))
    }
  }
})


test('second action filter keeps the selected topic and shows only the intended real offer in EN/RU/ES',()=>{
  for(const direction of ['energy','relationships','business']){
    for(const locale of ['en','ru','es']){
      const f=fixture(direction,locale)
      let tree=f.render()
      const actions=nodes(tree).filter(n=>n.props?.['data-direction-intent'])
      assert.equal(by(tree,'data-direction-action-finder',true).length,1)
      assert.deepEqual(actions.map(n=>n.props['data-direction-intent']),['test','advice','course','session'])
      assert.ok(actions.every(n=>n.type==='button' && n.props['aria-pressed']===false))
      assert.ok(actions.every(n=>n.props['aria-controls']==='hh-direction-sections'))
      assert.deepEqual(nodes(tree).filter(n=>n.props?.['data-direction-section'])
        .map(n=>n.props['data-direction-section']),['test','course','session'])

      // Topic and action are independent; selecting an action never changes the
      // person's test focus nor creates a CRM request or an appointment.
      const topic=journey(direction).topics[1].id
      by(tree,'data-direction-filter',topic)[0].props.onClick()
      tree=f.render()
      for(const intent of ['test','course','session']){
        by(tree,'data-direction-intent',intent)[0].props.onClick()
        tree=f.render()
        assert.deepEqual(nodes(tree).filter(n=>n.props?.['data-direction-section'])
          .map(n=>n.props['data-direction-section']),[intent])
        assert.equal(by(tree,'data-offer-action',intent).length,2)
        assert.equal(by(tree,'data-direction-intent',intent)[0].props['aria-pressed'],true)
        assert.equal(by(tree,'data-direction-filter',topic)[0].props['aria-pressed'],true)
        if(intent==='test') assert.match(by(tree,'data-offer-action','test')[0].props.href,new RegExp('topics='+topic+'$'))
        by(tree,'data-direction-action-reset',true)[0].props.onClick()
        tree=f.render()
      }

      by(tree,'data-direction-intent','advice')[0].props.onClick()
      tree=f.render()
      assert.deepEqual(nodes(tree).filter(n=>n.props?.['data-direction-section'])
        .map(n=>n.props['data-direction-section']),['advice'])
      const advice=by(tree,'data-offer-action','advice')
      assert.equal(advice.length,1)
      assert.equal(advice[0].props.href,'/'+locale+'/services/free-situation-review')
      assert.equal(by(tree,'data-direction-filter',topic)[0].props['aria-pressed'],true)
      assert.equal(by(tree,'data-offer-action','session').length,0,'Advice is not sold as a paid appointment')

      // Tapping the active action again resets the section filter in place.
      by(tree,'data-direction-intent','advice')[0].props.onClick()
      tree=f.render()
      assert.deepEqual(nodes(tree).filter(n=>n.props?.['data-direction-section'])
        .map(n=>n.props['data-direction-section']),['test','course','session'])
      assert.equal(by(tree,'data-direction-filter',topic)[0].props['aria-pressed'],true)
      assert.equal(by(tree,'data-direction-action-reset',true).length,0)
    }
  }
  for(const label of ['Take a test','Get advice','Take a course','Get a consultation',
    'Пройти тест','Получить совет','Пройти курс','Получить консультацию',
    'Hacer un test','Recibir orientación','Hacer un curso','Solicitar una consulta'])
    assert.ok(source.includes(label),label)
  assert.match(css,/\.actionFinder\{display:flex;align-items:center;/)
  assert.match(css,/\.actionChips\{display:grid;flex:1 1 0;min-width:0;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/)
  assert.match(css,/\.topicChips\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.doesNotMatch(css,/\.topicChips,\.actionChips\{grid-template-columns:repeat\(2/)
  assert.match(css,/\.actionChip\[aria-pressed="true"\]/)
  assert.match(css,/@media\(max-width:350px\)/)
  assert.doesNotMatch(source,/\/api\/service-enquiries|sendBeacon|localStorage/)
})


test('guided dialogue auto-selects topic, action and a real offer in nine localized journeys',()=>{
  const cases=[
    ['energy','en','I cannot sleep and would like a course','sleep','course'],
    ['energy','ru','Не могу спать и хочу пройти тест','sleep','test'],
    ['energy','es','Quiero dormir y recibir un consejo','sleep','advice'],
    ['relationships','en','Conflict and communication: book a consultation','conflict','session'],
    ['relationships','ru','Конфликт и общение, хочу консультацию','conflict','session'],
    ['relationships','es','Tengo problemas con límites, quiero un curso','boundaries','course'],
    ['business','en','I need more clients and want a course','productivity','course'],
    ['business','ru','Выгорание на работе, хочу пройти тест','work-stress','test'],
    ['business','es','Quiero aprender a ganar dinero','money-beliefs','course'],
  ]
  for (const [direction,locale,request,topic,intent] of cases){
    const f=fixture(direction,locale)
    let tree=f.render()
    assert.equal(by(tree,'data-direction-dialogue',true).length,0,'dialog starts closed')
    nodes(tree).find(n=>n.props?.id==='hh-direction-wish').props.onChange({target:{value:request}})
    tree=f.render()
    by(tree,'data-direction-wish-submit',true)[0].props.onClick()
    tree=f.render()
    const dialog=by(tree,'data-direction-dialogue',true)
    assert.equal(dialog.length,1,'dialog appears directly below first hero after submit')
    assert.equal(dialog[0].props['data-dialog-topic'],topic)
    assert.equal(dialog[0].props['data-dialog-intent'],intent)
    assert.equal(by(tree,'data-direction-filter',topic)[0].props['aria-pressed'],true)
    assert.equal(by(tree,'data-direction-intent',intent)[0].props['aria-pressed'],true)
    const expectedSection=intent==='advice'?'advice':intent
    assert.deepEqual(nodes(tree).filter(n=>n.props?.['data-direction-section'])
      .map(n=>n.props['data-direction-section']),[expectedSection])
    const selectedLink=nodes(tree).filter(n=>n.props?.['data-dialog-offer'])[0]
    assert.ok(selectedLink,'real recommendation is clickable')
    assert.equal(selectedLink.props.href,by(tree,'data-offer-action',intent)[0].props.href)
    assert.ok(selectedLink.props.href.startsWith('/'+locale+'/') ||
      (locale==='es' && selectedLink.props.href.startsWith('/en/')))
    assert.ok(!selectedLink.props.href.includes(encodeURIComponent(request)))
    assert.equal(by(tree,'data-dialog-refine','topic').length,1)
    assert.equal(by(tree,'data-dialog-refine','intent').length,1)
  }
})

test('dialogue clarification preserves the topic, updates either filter and supports chip-led navigation',()=>{
  const f=fixture('energy','en')
  let tree=f.render()
  nodes(tree).find(n=>n.props?.id==='hh-direction-wish')
    .props.onChange({target:{value:'I want to take a course for poor sleep'}})
  tree=f.render()
  by(tree,'data-direction-wish-submit',true)[0].props.onClick()
  tree=f.render()
  assert.equal(by(tree,'data-direction-filter','sleep')[0].props['aria-pressed'],true)
  assert.equal(by(tree,'data-direction-intent','course')[0].props['aria-pressed'],true)

  // A free-text clarification updates only the part it names.
  nodes(tree).find(n=>n.props?.id==='hh-direction-followup')
    .props.onChange({target:{value:'Actually, a test instead'}})
  tree=f.render()
  by(tree,'data-dialog-followup-form',true)[0].props.onSubmit({preventDefault(){}})
  tree=f.render()
  assert.equal(by(tree,'data-direction-filter','sleep')[0].props['aria-pressed'],true)
  assert.equal(by(tree,'data-direction-intent','test')[0].props['aria-pressed'],true)
  assert.equal(by(tree,'data-offer-action','test').length,2)
  assert.equal(nodes(tree).filter(n=>n.props?.['data-dialog-offer'])[0].props.href,by(tree,'data-offer-action','test')[0].props.href)

  by(tree,'data-dialog-refine','topic')[0].props.onClick()
  tree=f.render()
  assert.equal(by(tree,'data-dialog-topic-choice','resources').length,1)
  by(tree,'data-dialog-topic-choice','resources')[0].props.onClick()
  tree=f.render()
  assert.equal(by(tree,'data-direction-filter','resources')[0].props['aria-pressed'],true)
  assert.equal(by(tree,'data-direction-intent','test')[0].props['aria-pressed'],true)

  by(tree,'data-dialog-close',true)[0].props.onClick()
  tree=f.render()
  assert.equal(by(tree,'data-direction-dialogue',true).length,0)
  assert.equal(by(tree,'data-direction-filter','resources')[0].props['aria-pressed'],true,
    'closing the explanation must not reset the actual filters')

  // An unrecognized new query never invents a matching focus.
  by(tree,'data-direction-wish-submit',true)[0].props.onClick()
  tree=f.render()
  nodes(tree).find(n=>n.props?.id==='hh-direction-wish')
    .props.onChange({target:{value:'zxqv zysp unseen idea'}})
  tree=f.render()
  by(tree,'data-direction-wish-submit',true)[0].props.onClick()
  tree=f.render()
  assert.equal(by(tree,'data-direction-filter','all')[0].props['aria-pressed'],true)
  assert.equal(by(tree,'data-dialog-topic-choice','sleep').length,1)
  assert.equal(nodes(tree).filter(n=>n.props?.['data-dialog-offer']).length,0)
  by(tree,'data-dialog-topic-choice','sleep')[0].props.onClick()
  tree=f.render()
  assert.equal(by(tree,'data-dialog-intent-choice','course').length,1)
  by(tree,'data-dialog-intent-choice','course')[0].props.onClick()
  tree=f.render()
  assert.equal(nodes(tree).filter(n=>n.props?.['data-dialog-offer']).length,1)
  by(tree,'data-dialog-reset',true)[0].props.onClick()
  tree=f.render()
  assert.equal(by(tree,'data-direction-dialogue',true).length,0)
  assert.equal(by(tree,'data-direction-filter','all')[0].props['aria-pressed'],true)
  assert.deepEqual(nodes(tree).filter(n=>n.props?.['data-direction-section'])
    .map(n=>n.props['data-direction-section']),['test','course','session'])
})

test('urgent text hides marketing and the local dialogue has privacy-safe responsive controls',()=>{
  for (const [locale,text] of [
    ['en','I want to kill myself'],['ru','Хочу умереть'],['es','Quiero morir'],
  ]){
    const f=fixture('energy',locale)
    let tree=f.render()
    nodes(tree).find(n=>n.props?.id==='hh-direction-wish').props.onChange({target:{value:text}})
    tree=f.render()
    by(tree,'data-direction-wish-submit',true)[0].props.onClick()
    tree=f.render()
    assert.equal(by(tree,'data-direction-dialogue',true).length,1)
    assert.equal(nodes(tree).filter(n=>n.props?.role==='alert').length,1)
    assert.equal(nodes(tree).filter(n=>n.props?.['data-direction-section']).length,0)
    assert.equal(nodes(tree).filter(n=>n.props?.['data-offer-action']).length,0)
    by(tree,'data-dialog-reset',true)[0].props.onClick()
    tree=f.render()
    assert.equal(nodes(tree).filter(n=>n.props?.['data-direction-section']).length,3)
  }
  assert.doesNotMatch(source,/fetch\(|sendBeacon|localStorage|sessionStorage|\/api\/service-enquiries/)
  assert.match(css,/\.dialogPanel\{width:min\(780px,100%\)/)
  assert.match(css,/\.dialogReply input\{[^}]*font:450 16px/)
  assert.match(css,/\.dialogPanel :is\(a,button,input\):focus-visible/)
  assert.match(css,/@media\(max-width:480px\)\{[\s\S]*?\.dialogChips\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.doesNotMatch(css,/overflow-x:auto/)
})

test('manual topic and action controls do not unexpectedly reveal the conversation panel',()=>{
  for (const direction of ['energy','relationships','business']) {
    for (const locale of ['en','ru','es']) {
      const f=fixture(direction,locale)
      let tree=f.render()
      const topic=journey(direction).topics[0].id
      by(tree,'data-direction-filter',topic)[0].props.onClick()
      tree=f.render()
      assert.equal(by(tree,'data-direction-dialogue',true).length,0)
      by(tree,'data-direction-intent','course')[0].props.onClick()
      tree=f.render()
      assert.equal(by(tree,'data-direction-dialogue',true).length,0)
      assert.equal(by(tree,'data-direction-filter',topic)[0].props['aria-pressed'],true)
      assert.equal(by(tree,'data-direction-intent','course')[0].props['aria-pressed'],true)
      by(tree,'data-direction-action-reset',true)[0].props.onClick()
      tree=f.render()
      assert.equal(by(tree,'data-direction-dialogue',true).length,0)
      assert.deepEqual(nodes(tree).filter(n=>n.props?.['data-direction-section'])
        .map(n=>n.props['data-direction-section']),['test','course','session'])
    }
  }
})

test('closing urgent safety guide restores ordinary browsing and clears unsafe query',()=>{
  const f=fixture('energy','ru')
  let tree=f.render()
  nodes(tree).find(n=>n.props?.id==='hh-direction-wish').props.onChange({target:{value:'Хочу умереть'}})
  tree=f.render()
  by(tree,'data-direction-wish-submit',true)[0].props.onClick()
  tree=f.render()
  assert.equal(nodes(tree).filter(n=>n.props?.role==='alert').length,1)
  by(tree,'data-dialog-close',true)[0].props.onClick()
  tree=f.render()
  assert.equal(by(tree,'data-direction-dialogue',true).length,0)
  assert.equal(nodes(tree).filter(n=>n.props?.['data-direction-section']).length,3)
  assert.equal(nodes(tree).find(n=>n.props?.id==='hh-direction-wish').props.value,'')
})
