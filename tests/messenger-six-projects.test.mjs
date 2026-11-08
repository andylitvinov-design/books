import {readFileSync,existsSync} from 'node:fs'
import assert from 'node:assert/strict'
import test from 'node:test'
import ts from 'typescript'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const project=read('components/app/messenger-six-projects.tsx')
const projectCss=read('components/app/messenger-six-projects.module.css')
const agent=read('components/holistic-agent-chat.tsx')
const agentCss=read('components/holistic-agent-chat.module.css')
const runner=read('components/app/messenger-test-journey.jsx')

test('one illustrated entry with exactly the six owner-approved projects, RU/EN/ES',()=>{
 for(const locale of ['en','ru','es'])assert.match(project,new RegExp('  '+locale+':\\{'))
 for(const id of ['hint','test','mytube','sessions','practice','ai-video']){
   assert.ok(project.includes('id:"'+id+'"'),id)
   assert.ok(projectCss.includes('data-hh-ai-project="'+id+'"'),id)
 }
 assert.match(project,/data-hh-messenger-six-projects/)
 assert.match(agent,/messengerView&&!messages\.length&&<MessengerSixProjects locale=\{locale\} onSelect=\{startProject\}/)
 assert.match(agentCss,/data-hh-ai-quick-actions\]\)\{display:none\}/)
 assert.match(agent,/messengerView&&!messages\.length&&<MessengerAiLanding/)
 assert.match(projectCss,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
 assert.match(projectCss,/@media\(min-width:700px\)/)
})

test('one active question, max four options, free typing and protected reply unchanged',()=>{
 assert.match(agent,/setProjectFlow\(id\)/)
 assert.match(agent,/entry\.question/)
 assert.match(agent,/data-hh-project-step=\{projectFlow\}/)
 assert.match(agent,/options\.slice\(0,4\)/)
 assert.match(agent,/onClick=\{\(\)=>selectProjectOption\(option\)\}/)
 assert.match(agent,/setProjectFlow\(null\);setPageHelpLink\(null\)/)
 assert.match(agent,/setProjectFlow\(null\);setTestFocus\(null\)/)
 assert.match(agent,/composerRef\.current\?\.focus/)
 assert.match(agent,/<form onSubmit=\{submit\} className=\{styles\.form\}>/)
 assert.match(agent,/fetch\("\/api\/holistic-agent\/turn"/)
 assert.match(agent,/ownedInferenceConsent:mode==="owned"&&agree/)
 assert.doesNotMatch(project,/fetch\(|new WebSocket|localStorage|checkout|generateVideo/)
})

test('real existing flows: personality tests, MyTube, sessions, education, content Studio',()=>{
 assert.match(agent,/setTestFocus\(option\.focus\);setGuideLink\("tests"\);setTestChatOpen\(true\)/)
 assert.match(agent,/MessengerTestJourney key=\{testFocus\|\|"all"\} locale=\{locale\} focus=\{testFocus\}/)
 assert.match(runner,/const focusMatches = focus && FOCUS_TERMS\[focus\]/)
 assert.match(runner,/rightsStatus === 'cleared' && item\.guestEligible === true/)
 assert.match(runner,/const source = !search\.trim\(\) && !expanded && focusMatches\.length \? focusMatches : ALL_TESTS/)
 assert.match(agent,/if\(id==="ai-video"\)\{startContent\(\);return;\}/)
 assert.match(agent,/data-hh-content-kind=\{kind\}/)
 for(const path of ['app/[locale]/mytube/page.tsx','app/[locale]/tests/page.tsx',
   'app/[locale]/courses/antistress','app/[locale]/services/business-consulting',
   'app/[locale]/meditations/page.tsx','app/[locale]/academy/[[...slug]]/page.tsx'])
   assert.ok(existsSync(new URL('../'+path,import.meta.url)),path)
 for(const suffix of ['/mytube?goal=stress','/services/free-situation-review',
   '/services/business-consulting','/academy/principles-of-energywork/learn',
   '/courses/antistress','/meditations'])
   assert.ok(project.includes('href:"'+suffix+'"'),suffix)
})

test('React and JS project files have valid syntax without adding providers',()=>{
 for(const path of ['components/app/messenger-six-projects.tsx',
   'components/holistic-agent-chat.tsx','components/app/messenger-test-journey.jsx']){
   const out=ts.transpileModule(read(path),{fileName:path,reportDiagnostics:true,
     compilerOptions:{allowJs:true,jsx:ts.JsxEmit.ReactJSX,
       target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}})
   assert.deepEqual((out.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error)
      .map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[],path)
 }
})
