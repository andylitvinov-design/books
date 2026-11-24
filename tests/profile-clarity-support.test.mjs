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
