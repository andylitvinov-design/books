import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import vm from 'node:vm'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const component = read('components/coaching-live-session-capture.jsx')
const css = read('components/coaching-live-session-capture.module.css')
const lounge = read('components/public-coaching-discovery.jsx')

// PR1911 restores real selection guidance beside the one capture. Evaluate only
// that actual returned JSX section, never the lounge's hooks, transport or data.
function assertRestoredFit(source) {
  const file = ts.createSourceFile('lounge.jsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX)
  assert.equal(file.parseDiagnostics.length, 0)
  const descendants = node => { const out=[]; const visit=value=>{out.push(value);ts.forEachChild(value,visit)};visit(node);return out }
  const declared = (scope,name) => scope.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations])
    .find(node=>node.name.getText(file)===name)?.initializer
  const owner = file.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='PublicCoachingDiscovery')
  const returned = owner?.body?.statements.at(-1)
  assert.ok(returned&&ts.isReturnStatement(returned),'Actual lounge final return')
  assert.equal(owner.body.statements.filter(ts.isReturnStatement).length,1)
  const sections = descendants(returned.expression).filter(node=>ts.isJsxElement(node)&&node.openingElement.attributes.properties
    .some(prop=>prop.name?.getText(file)==='data-coaching-session-capture'))
  assert.equal(sections.length,1,'One actual human capture section')
  const section=sections[0]
  const jsx=(type,props)=>({type,props:props||{}})
  const hidden=props=>Boolean(props?.hidden)||props?.['aria-hidden']===true||props?.['aria-hidden']==='true'
    ||props?.style?.display==='none'||['hidden','collapse'].includes(props?.style?.visibility)
  const nodes=tree=>Array.isArray(tree)?tree.flatMap(nodes):!tree||typeof tree!=='object'||hidden(tree.props)?[]:[tree,...nodes(tree.props.children)]
  const text=tree=>Array.isArray(tree)?tree.map(text).join(''):tree==null||typeof tree==='boolean'?'':typeof tree==='object'?hidden(tree.props)?'':text(tree.props.children):String(tree)
  const evaluate=(node,bindings={})=>{
    assert.ok(node,'Actual declaration exists')
    const module={exports:{}}
    const code=ts.transpileModule('export const value=('+node.getText(file)+')',{fileName:'fit.jsx',compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
    vm.runInNewContext(code,{module,exports:module.exports,...bindings,require:id=>{assert.equal(id,'react/jsx-runtime');return {jsx,jsxs:jsx,Fragment:'fragment'}}},{timeout:1000})
    return module.exports.value
  }
  const expected={
    en:{title:'Is this the right coach for me?',intro:'Before sending a request, check the points that really matter:',checks:['Relevant experience with your particular goal and a clear explanation of training.','An approach and communication style where you feel heard, safe and comfortable.','Spoken language, online format, price, length and how to confirm a session.'],notice:'Andrey is the one personal coach listed here. No credential, review score or availability has been independently verified on this page.'},
    ru:{title:'Подходит ли вам этот специалист?',intro:'Перед заявкой полезно уточнить:',checks:['Опыт работы с похожими запросами и подтверждаемое образование или подготовку.','Как специалист работает, комфортны ли вам его стиль и общение.','Язык беседы, формат онлайн, стоимость, длительность и порядок подтверждения записи.'],notice:'В данном разделе представлен один специалист — Андрей. Квалификация, отзывы и доступность не проходили независимую проверку на этой странице.'},
    es:{title:'¿Es el profesional adecuado para mí?',intro:'Antes de solicitar, conviene consultar:',checks:['Experiencia relevante y formación que puedas comprobar.','Método de trabajo y un estilo de comunicación en el que te sientas escuchado.','Idioma de conversación, modalidad online, precio, duración y confirmación.'],notice:'Andrey es el único profesional personal presentado aquí. Esta página no verifica de forma independiente credenciales, reseñas o disponibilidad.'},
  }
  const copy=evaluate(declared(file,'copy'))
  for(const locale of ['en','ru','es']){
    const lang=evaluate(declared(owner.body,'lang'),{locale,copy})
    const t=evaluate(declared(owner.body,'t'),{lang,copy})
    assert.equal(lang,locale)
    const tree=evaluate(section,{lang,t,styles:new Proxy({},{get:(_,key)=>String(key)}),CoachingLiveSessionCapture:'capture'})
    const rendered=nodes(tree),fit=rendered.filter(node=>node.props['data-coaching-practitioner-checklist']!==undefined)
    const captures=rendered.filter(node=>node.type==='capture')
    assert.equal(fit.length,1,'One explicitly non-hidden suitability block')
    assert.equal(captures.length,1,'Keep one explicitly non-hidden live capture')
    assert.equal(captures[0].props.locale,locale)
    assert.ok(rendered.indexOf(fit[0])<rendered.indexOf(captures[0]),'Fit guidance precedes the live request')
    const body=nodes(fit[0]),e=expected[locale]
    assert.equal(text(body.find(node=>node.type==='strong')),e.title)
    assert.deepEqual(body.filter(node=>node.type==='li').map(text),e.checks)
    assert.deepEqual(body.filter(node=>node.type==='p').map(text),[e.intro,e.notice])
    for(const format of ['all','human','self'])for(const session of [null,{schemeKey:'fictional'}]){
      let visible=true,child=section
      for(let parent=child.parent;parent!==returned;child=parent,parent=parent.parent){
        assert.ok(parent)
        if(ts.isBinaryExpression(parent)){
          assert.equal(parent.operatorToken.kind,ts.SyntaxKind.AmpersandAmpersandToken);assert.equal(parent.right,child)
          visible=visible&&Boolean(evaluate(parent.left,{format,session}))
        }else if(ts.isConditionalExpression(parent))visible=visible&&child===(evaluate(parent.condition,{format,session})?parent.whenTrue:parent.whenFalse)
        else {
          assert.ok(ts.isJsxElement(parent)||ts.isJsxFragment(parent)||ts.isJsxExpression(parent)||ts.isParenthesizedExpression(parent),'Guidance is on the actual render path')
          if(ts.isJsxElement(parent)){
            const props={}
            for(const attr of parent.openingElement.attributes.properties){
              const name=attr.name?.getText(file)
              if(!['hidden','aria-hidden','style'].includes(name))continue
              props[name]=!attr.initializer?true:ts.isJsxExpression(attr.initializer)?evaluate(attr.initializer.expression,{format,session,locale,lang,t}):attr.initializer.text
            }
            assert.equal(hidden(props),false,'No explicitly hidden ancestor')
          }
        }
      }
      assert.equal(visible,!session&&format!=='self','Guidance and capture share the intended discovery visibility')
    }
  }
}

test('Coaching & Hypnotherapy has one live capture with all three localized options', () => {
  assert.match(lounge, /<CoachingLiveSessionCapture locale=\{lang\}/)
  assert.equal((lounge.match(/data-coaching-session-capture/g) || []).length, 1)
  assertRestoredFit(lounge)
  assert.doesNotMatch(lounge, /data-coaching-paid-sessions/)
  assert.match(component, /offers = \['free', 'short', 'full'\]/)
  for (const label of [
    'Coaching & Hypnotherapy', 'Коучинг и гипнотерапия', 'Coaching e hipnoterapia',
    'Free express assessment', 'Бесплатная экспресс-диагностика', 'Evaluación exprés gratuita',
    'Short session · 30 min', 'Краткая сессия · 30 мин', 'Sesión breve · 30 min',
    'Full session · 60 min', 'Полная сессия · 60 мин', 'Sesión completa · 60 min',
    '€50', '€100',
  ]) assert.ok(component.includes(label), label)
})

test('restored fit contract rejects missing, dead, untranslated or misleading guidance', () => {
  for(const [before,after] of [
    ['data-coaching-practitioner-checklist','data-missing-checklist'],
    ['<div className={styles.coachFit} data-coaching-practitioner-checklist>','<div hidden className={styles.coachFit} data-coaching-practitioner-checklist>'],
    ['<p className={styles.coachOnly}>{t.coachOnly}</p>','<p className={styles.coachOnly}>Verified credentials</p>'],
    ['<p className={styles.coachOnly}>','<p aria-hidden="true" className={styles.coachOnly}>'],
    ['{t.coachFitChecks.map((text,i)=><li key={i}>{text}</li>)}','{t.coachFitChecks.map((text,i)=><li key={i}>Placeholder</li>)}'],
    ["t=copy[lang]","t=copy.en"],
    ["format!=='self'&&<section className={styles.catalog}","false&&format!=='self'&&<section className={styles.catalog}"],
    ['return <main ref={rootRef}', 'return <main hidden ref={rootRef}'],
  ]){
    assert.ok(lounge.includes(before),'Negative control edits the actual source')
    assert.throws(()=>assertRestoredFit(lounge.replace(before,after)),{code:'ERR_ASSERTION'})
  }
})

test('free choice opens existing free intake, paid choices open a truthful consent-based request', () => {
  assert.match(component, /useState\('free'\)/)
  assert.match(component, /role="radiogroup"/)
  assert.match(component, /role="radio" aria-checked=\{active\}/)
  assert.match(component, /onClick=\{\(\) => setSelected\(key\)\}/)
  assert.match(component, /whatsappEnquiryUrl\(\{/)
  assert.match(component, /ContactChannelChooser/)
  assert.match(component, /label=\{t\.actions\[selected\]\}/)
  assert.match(component, /\/services\/free-situation-review/)
  assert.match(component, /analyticsEvent="free_situation_assessment_click"/)
  assert.match(component, /time and format are confirmed personally before any payment/)
  assert.match(component, /not a live call or medical diagnosis/)
  assert.doesNotMatch(component, /localStorage|sessionStorage|fetch\(|window\.open|checkout/)
})

test('capture is mobile legible and parses as JSX', () => {
  assert.match(css, /background:#fcf8f1/)
  assert.match(css, /background:#893751/)
  assert.match(css, /@media\(max-width:600px\)/)
  assert.match(css, /prefers-reduced-motion/)
  assert.match(css, /:focus-visible/)
  const parsed = ts.createSourceFile('coaching-live-session-capture.jsx', component, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX)
  assert.equal(parsed.parseDiagnostics.length, 0)
})
