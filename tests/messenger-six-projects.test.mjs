import {readFileSync,existsSync} from 'node:fs'
import assert from 'node:assert/strict'
import test from 'node:test'
import ts from 'typescript'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const projects=read('components/app/messenger-six-projects.tsx')
const projectCss=read('components/app/messenger-six-projects.module.css')
const agent=read('components/holistic-agent-chat.tsx')
const agentCss=read('components/holistic-agent-chat.module.css')
const runner=read('components/app/messenger-test-journey.jsx')

test('first screen shows six owner-requested projects with explanatory subtitles in RU/EN/ES',()=>{
 for(const locale of ['en','ru','es'])assert.match(projects,new RegExp('^'+locale+':\\{','m'))
 const ru=projects.slice(projects.indexOf("\nru:{"),projects.indexOf("\nes:{"));
 const es=projects.slice(projects.indexOf("\nes:{"));
 for(const title of ['title:"Подсказка"','title:"Тесты"','title:"Сессии"','title:"Практики"'])
   assert.ok(ru.includes(title),title);
 for(const title of ['title:"Orientación"','title:"Test"','title:"Sesiones"','title:"Práctica"'])
   assert.ok(es.includes(title),title);
 assert.doesNotMatch(ru,/title:"(?:Get a hint|Get a test|Sessions|Practice)"/);
 assert.doesNotMatch(es,/title:"(?:Get a hint|Get a test|Sessions|Practice)"/);
 for(const id of ['hint','test','mytube','sessions','practice','ai-video']){
   assert.ok(projects.includes('id:"'+id+'"'),id)
   assert.ok(projectCss.includes('data-hh-ai-project="'+id+'"'),id)
 }
 assert.match(agent,/messengerView&&!pageHelp&&!messages\.length&&<>/)
 assert.match(agent,/<MessengerSixProjects locale=\{locale\} onSelect=\{startProject\}\/>/)
 assert.match(agentCss,/data-hh-messenger-six-projects/)
 assert.match(projectCss,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
 assert.match(projectCss,/@media\(min-width:700px\)/)
 for(const subtitle of ['Life & business insights','Анализ жизни и бизнеса','Vida y negocios',
   'Watch supportive videos','Поддерживающие видео','Vídeos de apoyo'])
   assert.ok(projects.includes(subtitle),subtitle)
})

test('every follow-up button contains a clear label and an explanatory sentence',()=>{
 assert.match(projects,/description:string/)
 assert.match(agent,/data-hh-project-choice=\{option\.id\}/)
 assert.match(agent,/<strong>\{option\.label\}<\/strong><small>\{option\.description\}<\/small>/)
 assert.match(agentCss,/\.projectOptions button small/)
 assert.match(agentCss,/\.projectOptions button strong/)
 const optionBlocks=[...projects.matchAll(/options:\[([\s\S]*?)\]\}/g)]
   .map(match=>match[1]).filter(block=>block.trim())
 assert.equal(optionBlocks.length,15) // five directions × three locales
 for(const block of optionBlocks)
   assert.equal((block.match(/description:/g)||[]).length,4)
 assert.match(agent,/options\.slice\(0,4\)/)
})

test('each direction keeps a single-question dialogue and routes to existing first-party features',()=>{
 assert.match(agent,/setProjectFlow\(id\)/)
 assert.match(agent,/entry\.question/)
 assert.match(agent,/setProjectFlow\(null\)/)
 assert.match(agent,/composerRef\.current\?\.focus/)
 assert.match(agent,/<form onSubmit=\{submit\} className=\{styles\.form\}>/)
 assert.match(agent,/if\(id==="ai-video"\)\{startContent\(\);return;\}/)
 for(const path of ['app/[locale]/mytube/page.tsx','app/[locale]/tests/page.tsx',
   'app/[locale]/courses/antistress','app/[locale]/services/business-consulting',
   'app/[locale]/meditations/page.tsx','app/[locale]/academy/[[...slug]]/page.tsx'])
   assert.ok(existsSync(new URL('../'+path,import.meta.url)),path)
 for(const suffix of ['/mytube?goal=stress','/services/free-situation-review',
   '/services/business-consulting','/academy/principles-of-energywork/learn',
   '/courses/antistress','/meditations'])
   assert.ok(projects.includes('href:"'+suffix+'"'),suffix)
})

test('test topics prioritize existing cleared guest tests while the complete catalogue stays searchable and consented',()=>{
 assert.match(agent,/focus=\{testFocus\}/)
 assert.match(agent,/setTestFocus\(option\.focus\);setGuideLink\("tests"\);setTestChatOpen\(true\)/)
 assert.match(runner,/const FOCUS_TERMS =/)
 assert.match(runner,/rightsStatus === 'cleared' && item\.guestEligible === true/)
 // Focus controls ranking, not eligibility: the full cleared guest catalogue is still searchable.
 assert.match(runner,/const recommended = focusMatches\.length \? focusMatches : ALL_TESTS/)
 assert.match(runner,/const ranked = \[/)
 assert.match(runner,/\.\.\.recommended\.filter\(entry => entry\.item\.key !== featured\?\.item\.key\)/)
 assert.match(runner,/\.\.\.ALL_TESTS\.filter\(entry => !recommended\.some/)
 assert.match(runner,/const filtered = ranked\.filter\(entry =>/)
 assert.match(runner,/filtered\.slice\(0,visibleCount\)/)
 assert.match(runner,/if \(!adult \|\| !definition \|\| busy\) return/)
 assert.match(runner,/hasTraumaAdministration\(definition\)/)
})

test('all authored React modules transpile without syntax diagnostics',()=>{
 for(const path of ['components/app/messenger-six-projects.tsx',
   'components/holistic-agent-chat.tsx','components/app/messenger-test-journey.jsx']){
   const out=ts.transpileModule(read(path),{fileName:path,reportDiagnostics:true,
     compilerOptions:{allowJs:true,jsx:ts.JsxEmit.ReactJSX,
       target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}})
   assert.deepEqual((out.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error)
      .map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[],path)
 }
})
