import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read = name=>readFileSync(new URL('../'+name,import.meta.url),'utf8')
const source=read('components/app/profile-space-dashboard.jsx')
const css=read('components/app/profile-space-dashboard.module.css')
test('Profile has two top tabs and one four-step Clarity & Support journey',()=>{
 const tabs=source.slice(source.indexOf('const tabs = ['),source.indexOf('const diagnostics = ['))
 assert.match(tabs,/id: 'goals'/)
 assert.match(tabs,/id: 'clarity'/)
 assert.doesNotMatch(tabs,/id: '(tests|support)'/)
 assert.match(source,/data-profile-clarity-support/)
 assert.match(source,/data-clarity-stage/)
 assert.match(source,/\[0,2,2,1\]/)
 assert.match(source,/aria-expanded=\{expanded\}/)
 assert.match(source,/hidden=\{!expanded\}/)
 assert.match(css,/grid-template-columns:minmax\(0,\.88fr\) minmax\(0,1\.12fr\)/)
})
test('Clarity retains existing tools and account routes without fabricating saved progress',()=>{
 for(const path of ['/development-vectors','/tests','/course?view=courses','/portrait?space=reports','/portrait?space=sessions','/daybook?start=vector','/settings','/practice','/my-page','?view=consultation','?view=meditation']) assert.ok(source.includes(path),path)
 assert.match(source,/REIKI_FREE_COURSE_PATH/)
 assert.match(source,/accountId=\{accountId\}/)
 assert.doesNotMatch(source,/localStorage|sessionStorage/)
 for(const label of ['Clarity & Support','Ясность и поддержка','Claridad y apoyo'])assert.ok(source.includes(label))
})

test('Clarity buttons outrank shared cabinet buttons and retain compact mock layout',()=>{
 const scope='.dashboard[data-profile-space-section="clarity"]'
 for(const name of ['button.clarityNeed','button.clarityStep','.clarityHeroActions button']) assert.ok(css.includes(scope+' '+name))
 const scoped=css.slice(css.indexOf('/* CLARITY_MOCK_PARITY_20261124'))
 assert.match(scoped,/background:linear-gradient\(135deg,#fff9e6 0%,#f8dca7 100%\)/)
 assert.match(scoped,/text-align:left/)
 assert.match(scoped,/min-height:53px;padding:8px 7px/)
 assert.match(scoped,/min-height:44px;padding:6px 9px/)
 assert.match(scoped,/grid-template-columns:24px 22px minmax\(0,1fr\) 15px/)
 assert.match(scoped,/@media\(max-width:374px\)/)
 assert.match(source,/const stageIcons = \[Flower2,BarChart3,Leaf,Flag\]/)
})
