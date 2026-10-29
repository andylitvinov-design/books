import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {oporaExperienceGuide,oporaExperienceSupport,oporaExperienceDepth} from '../lib/inner-growth/opora-as56-experience-guides.js'
import {oporaAs58Day} from '../lib/inner-growth/opora-as58-one-action.js'
import {oporaAs59Day,OPORA_SEVEN_SKILLS_EDITION} from '../lib/inner-growth/opora-as59-seven-skills.js'
import {oporaAs60Day,OPORA_EXPERIENTIAL_EDITION} from '../lib/inner-growth/opora-as60-experiential-practices.js'
import {oporaAs60Journey,OPORA_EXPERIENCE_SCENES,OPORA_EXPERIENCE_CHANNELS} from '../lib/inner-growth/opora-as60-integrated-journey.js'
import {oporaAs60VariedDay,oporaAs60VariedJourney,OPORA_VARIETY_REVISION,OPORA_VARIETY_COPY} from '../lib/inner-growth/opora-as60-varied-content.js'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const source=read('components/app/opora-experience-player.jsx')
const ast=ts.createSourceFile('player.jsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
assert.equal(ast.parseDiagnostics.length,0)
const component=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='OporaExperiencePlayer')
assert.ok(component)
const declarations=new Map()
for(const statement of component.body.statements) if(ts.isVariableStatement(statement))
 for(const declaration of statement.declarationList.declarations) declarations.set(declaration.name.getText(ast),declaration)
const selected=['hasSaved','showIntegratedJourney','[answers,setAnswers]','showSkill60','showVariety','showSkill59','showCurrentSkill','dailyPlan','showNewPlan','support','depth','practiceGuide','journey']
for(const name of selected) assert.ok(declarations.has(name),name)
const selection=selected.map(name=>'const '+declarations.get(name).getText(ast)+';').join('\n')
const jsx=[]
function collect(node){if(ts.isJsxElement(node))jsx.push(node);ts.forEachChild(node,collect)}
collect(component)
const hasAttribute=(node,name)=>node.openingElement.attributes.properties.some(p=>ts.isJsxAttribute(p)&&p.name.getText(ast)===name)
const supportNode=jsx.find(n=>hasAttribute(n,'data-opora-daily-support'))
const practiceNode=jsx.find(n=>hasAttribute(n,'data-opora-one-daily-practice'))
const overviewNode=jsx.find(n=>hasAttribute(n,'data-opora-overview-purpose'))
assert.ok(supportNode&&practiceNode&&overviewNode)
const firstStrong=attribute=>{const wrapper=jsx.find(n=>hasAttribute(n,attribute));assert.ok(wrapper);return jsx.find(n=>n.pos>=wrapper.pos&&n.end<=wrapper.end&&n.openingElement.tagName.getText(ast)==='strong')}
const recapStrong=firstStrong('data-opora-lesson-recap'),homeworkStrong=firstStrong('data-opora-daily-homework')
assert.ok(recapStrong&&homeworkStrong)
const compile=text=>ts.transpileModule(text,{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
const textOf=node=>Array.isArray(node)?node.map(textOf).join(''):node&&typeof node==='object'?textOf(node.children):typeof node==='string'||typeof node==='number'?String(node):''
function actualSelection(locale,currentSession,day=5){
 const data={cycle:{day},currentSession},cycle=data.cycle
 const runtime={data,cycle,lang:locale,authored:{},t:{practiceText:'unused',firstExerciseDetail:'unused'},newDayOneIntro:false,
  useState:fn=>[fn(),()=>{throw new Error('No state mutation in pure oracle proof')}],
  oporaExperienceGuide,oporaExperienceSupport,oporaExperienceDepth,oporaAs58Day,oporaAs59Day,
  OPORA_SEVEN_SKILLS_EDITION,oporaAs60Day,OPORA_EXPERIENTIAL_EDITION,oporaAs60VariedDay,oporaAs60VariedJourney,oporaAs60Journey,OPORA_VARIETY_REVISION,
  plan:null,c:{notice:'archive'},editorial:OPORA_VARIETY_COPY[locale],j:{overviewPurposeLabel:'archived',dayOnePurpose:'unused'},
  styles:new Proxy({},{get:(_,key)=>String(key)}),React:{createElement:(type,props,...children)=>({type,props,children})}}
 const expression=selection+'\n({showSkill60,showVariety,support,practiceGuide,depth,dailyPlan,journey,'+
  'supportTree:('+supportNode.getText(ast)+'),practiceTree:('+practiceNode.getText(ast)+'),overviewTree:('+overviewNode.getText(ast)+'),recapTree:('+recapStrong.getText(ast)+'),homeworkTree:('+homeworkStrong.getText(ast)+')})'
 // Only exact declaration initializers and three inert JSX nodes execute; no UI mount/effects/browser/API.
 return vm.runInNewContext(compile(expression),runtime,{timeout:1000})
}
for(const locale of ['ru','en','es']){
 test(locale+' null session binds actual JSX to current AS6.0 variety producers',()=>{
  const active=actualSelection(locale,null),daily=oporaAs60VariedDay(5,locale)
  assert.equal(active.showSkill60,true);assert.equal(active.showVariety,true)
  assert.equal(active.support.title,daily.purposeTitle)
  assert.equal(textOf(active.supportTree),daily.purpose)
  assert.equal(textOf(active.practiceTree),daily.practice)
  assert.ok(textOf(active.overviewTree).endsWith(daily.result))
  assert.notEqual(textOf(active.supportTree),oporaExperienceSupport(5,locale).body,'old oracle must fail active copy')
  assert.notEqual(textOf(active.practiceTree),oporaExperienceGuide(5,locale),'old practice cannot silently substitute for active edition')
  assert.ok(daily.practice.length<=140&&daily.practice.split(/\s+/u).length<=20,'existing brief budget stays intact')
 })
 test(locale+' persisted legacy remains archival, never rewritten to current copy',()=>{
  const legacy=actualSelection(locale,{signals:{opora54:{answers:{}}}})
  assert.equal(legacy.showSkill60,false);assert.equal(legacy.showVariety,false)
  assert.equal(textOf(legacy.supportTree),oporaExperienceSupport(5,locale).body)
  assert.equal(textOf(legacy.practiceTree),oporaExperienceGuide(5,locale))
  assert.ok(textOf(legacy.overviewTree).endsWith(oporaExperienceDepth(5,locale).why))
  assert.notEqual(textOf(legacy.supportTree),oporaAs60VariedDay(5,locale).purpose)
 })
 test(locale+' persisted AS6.0 without revision retains original edition',()=>{
  const original=actualSelection(locale,{signals:{opora54:{answers:{experienceEdition:OPORA_EXPERIENTIAL_EDITION}}}},2)
  assert.equal(original.showSkill60,true);assert.equal(original.showVariety,false)
  assert.equal(textOf(original.supportTree),oporaAs60Day(2,locale).purpose)
  assert.notEqual(textOf(original.supportTree),oporaAs60VariedDay(2,locale).purpose,'wrong revision must be observable')
 })
}
test('actual player preserves four exact authored scenes before practice; verifier asserts their identity and copy',()=>{
 assert.deepEqual([...OPORA_EXPERIENCE_SCENES.slice(0,4)],['bodyExperience','emotionExperience','mentalExperience','imageryMeditation'])
 assert.deepEqual([...OPORA_EXPERIENCE_CHANNELS.slice(0,4)],['body','emotion','mental','imagery'])
 assert.match(source,/showIntegratedJourney\?OPORA_EXPERIENCE_SCENES\.slice\(0,4\):\[\]/)
 const browser=read('scripts/verify-opora-as56-browser.mjs')
 assert.ok(browser.includes('OPORA_EXPERIENCE_SCENES.slice(0, 4).entries()'))
 assert.ok(browser.includes('toContainText(journey[channel].text)'))
 assert.ok(browser.includes('toContainText(daily.result)'))
 assert.ok(browser.includes("toHaveAttribute('data-opora-content-revision', OPORA_VARIETY_REVISION)"))
 assert.ok(browser.includes("toHaveAttribute('data-opora-practical-skills-version', OPORA_EXPERIENTIAL_EDITION)"))
 assert.doesNotMatch(browser,/\.summaryItem/)
 assert.ok(browser.includes('toContainText(moment === \'recap\' ? daily.result : daily.transfer)'))
 assert.match(source,/data-opora-lesson-recap="true"/)
 assert.match(source,/data-opora-daily-homework=\{cycle\.day\}/)
 for(const invariant of ['requireHostedOporaBrowser(process.env)','currentSession: null',"route.abort('blockedbyclient')",'assert.equal(state.saves, 0','assert.deepEqual(unexpectedRequests, []','assert.equal(state.finalData, state.initialData','assert.equal(evidence.cases.length, 24)','await click(t.previous)','await click(t.neutral)'])assert.ok(browser.includes(invariant),invariant)
 assert.doesNotMatch(browser,/route\.continue|request\.post|\.request\.fetch/)
})

// Bind the test to the actual verifier, not only to production copy. An accidental
// stale literal/edition/locale in its expected expressions must fail this suite.
const browserSource=read('scripts/verify-opora-as56-browser.mjs')
function browserAst(source){
 const ast=ts.createSourceFile('verify.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS)
 assert.equal(ast.parseDiagnostics.length,0)
 const declarations=new Map(),expectations=[]
 function visit(node){
  if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name))declarations.set(node.name.text,node)
  if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='toContainText')expectations.push(node)
  ts.forEachChild(node,visit)
 }
 visit(ast)
 return {ast,declarations,expectations}
}
function verifierBindings(source,locale){
 const {ast,declarations}=browserAst(source),names=['daily','journey','brief','support']
 const code=names.map(name=>{const node=declarations.get(name);assert.ok(node,name);return 'const '+node.getText(ast)+';'}).join('\n')
 return vm.runInNewContext(compile(code+'\n({daily,journey,brief,support})'),
  {locale,oporaAs60VariedDay,oporaAs60VariedJourney,oporaExperienceGuide,oporaExperienceSupport,oporaAs58Day},{timeout:1000})
}
const sites={support:'data-opora-daily-support',overview:'data-opora-overview-purpose',journey:'data-opora-experience-channel',recap:'expect(card)'}
function expectationNode(source,site){
 const parsed=browserAst(source)
 const matches=parsed.expectations.filter(node=>node.expression.expression.getText(parsed.ast).includes(sites[site]))
 assert.equal(matches.length,1,site+' exact expected expression')
 assert.equal(matches[0].arguments.length,1)
 return {ast:parsed.ast,node:matches[0].arguments[0]}
}
function expected(source,site,bindings,extra={}){
 const {ast,node}=expectationNode(source,site)
 return vm.runInNewContext(compile('('+node.getText(ast)+')'),{...bindings,...extra},{timeout:1000})
}
function assertActualBindings(source){
 for(const locale of ['ru','en','es']){
  const player=actualSelection(locale,null),bindings=verifierBindings(source,locale)
  assert.equal(bindings.support.title,player.support.title,locale+' verifier heading oracle')
  assert.equal(expected(source,'support',bindings),textOf(player.supportTree),locale+' verifier support oracle')
  assert.equal(bindings.brief,textOf(player.practiceTree),locale+' verifier brief oracle')
  const overviewParagraph=player.overviewTree.children.find(node=>node?.type==='p')
  assert.ok(overviewParagraph)
  assert.equal(expected(source,'overview',bindings),textOf(overviewParagraph),locale+' verifier overview oracle')
  for(const channel of OPORA_EXPERIENCE_CHANNELS.slice(0,4))
   assert.equal(expected(source,'journey',bindings,{channel}),player.journey[channel].text,locale+' '+channel+' authored channel oracle')
  assert.equal(expected(source,'recap',bindings,{moment:'recap'}),textOf(player.recapTree),locale+' verifier result oracle')
  assert.equal(expected(source,'recap',bindings,{moment:'recapNext'}),textOf(player.homeworkTree),locale+' verifier homework oracle')
 }
}
function mutateDeclaration(source,name,expression){
 const {ast,declarations}=browserAst(source),node=declarations.get(name)?.initializer
 assert.ok(node)
 return source.slice(0,node.getStart(ast))+expression+source.slice(node.end)
}
function mutateExpected(source,site,expression){
 const {ast,node}=expectationNode(source,site)
 return source.slice(0,node.getStart(ast))+expression+source.slice(node.end)
}
test('actual verifier support, brief, overview, four channels and recap expected expressions match selected player JSX',()=>assertActualBindings(browserSource))
for(const [name,source]of [
 ['stale brief literal',mutateDeclaration(browserSource,'brief','"STALE_ORACLE_SENTINEL"')],
 ['archived practice',mutateDeclaration(browserSource,'brief','oporaExperienceGuide(5, locale)')],
 ['archived support',mutateDeclaration(browserSource,'support','oporaExperienceSupport(5, locale)')],
 ['wrong locale',mutateDeclaration(browserSource,'daily','oporaAs60VariedDay(5, "ru")')],
 ['wrong historical edition',mutateDeclaration(browserSource,'daily','oporaAs58Day(5, locale)')],
 ['wrong day channel',mutateDeclaration(browserSource,'journey','oporaAs60VariedJourney(6, locale)')],
 ...Object.keys(sites).map(site=>['wrong '+site+' expected expression',mutateExpected(browserSource,site,'"WRONG_EXPECTED_COPY"')]),
])test('negative control rejects '+name,()=>assert.throws(()=>assertActualBindings(source), error=>error?.name==='AssertionError'))
