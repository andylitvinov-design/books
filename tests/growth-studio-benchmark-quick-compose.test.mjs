import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const studio=read('components/growth-studio.jsx')
const connections=read('components/growth-studio-connections.jsx')
const css=read('components/growth-studio.module.css')

test('owner-only Growth Studio remains in the original route with no new publisher or auth exception',()=>{
  const page=read('app/admin/growth-studio/page.js')
  const actions=read('app/admin/growth-studio/actions.js')
  assert.match(page,/requireAdminRequest\(\)/)
  assert.match(page,/robots:\{index:false,follow:false\}/)
  assert.match(page,/<GrowthStudio initialLocale=\{locale\}/)
  assert.match(actions,/requireAdminRequest\(\)/)
  assert.doesNotMatch(studio,/localStorage|sessionStorage|apiKey|client_secret|window\.fetch\(['"]https:\/\/api\.telegram/)
})

test('clean-room quick start is one compact task and opens existing composer without provider calls',()=>{
  const quick=studio.indexOf('<div className={styles.quickLaunch}>')
  const component=studio.indexOf('<GrowthStudioConnections locale={locale} telegram={telegram}',quick)
  const full=studio.indexOf('{workspaceOpen&&<>',component)
  assert.ok(quick>0 && component>quick && full>component)
  const start=studio.slice(quick,component)
  assert.match(start,/t\.quickTitle/)
  assert.match(start,/t\.quickGuide/)
  assert.match(start,/onClick=\{\(\)=>openWorkspace\('compose'\)\}/)
  assert.match(start,/disabled=\{!ready\|\|!storageVerified\|\|busy\}/)
  assert.match(start,/t\.quickPosts/)
  assert.doesNotMatch(start,/publishGrowthTelegramNowAction|execute\('save'\)/)
  assert.match(studio,/channel:'manual'/)
  assert.match(studio,/scrollIntoView/)
  assert.match(studio,/prefers-reduced-motion/)
  assert.match(studio,/\{workspaceOpen&&<div className=\{styles\.intro\}>/)
})

test('fast editor exposes only channel, title and caption before optional advanced fields',()=>{
  const start=studio.indexOf('<div className={styles.quickComposerFields}>')
  const finish=studio.indexOf('</div>',start)
  const advanced=studio.indexOf('<details key={editing?.id',finish)
  const advancedEnd=studio.indexOf('</details>',advanced)
  const save=studio.indexOf('<div className={styles.editorActions}>',advancedEnd)
  assert.ok(start>0 && finish>start && advanced>finish && advancedEnd>advanced && save>advancedEnd)
  const basic=studio.slice(start,finish)
  for(const field of ['t.channel','t.title','t.caption'])assert.ok(basic.includes(field),field)
  for(const field of ['t.brand','t.language','t.campaign','t.media','t.mediaAlt','t.source','t.schedule']){
    assert.ok(studio.slice(advanced,advancedEnd).includes(field),'optional field: '+field)
    assert.ok(!basic.includes(field),'basic field should not contain '+field)
  }
  assert.match(studio.slice(advanced,advancedEnd),/open=\{isEditing\}/)
  assert.match(studio,/locale:initialLocale==='ru'\?'ru':'en'/)
  assert.match(studio,/previous\.title\|\|previous\.caption/)
  assert.match(studio,/onClick=\{\(\)=>execute\('save'\)\}/)
})

test('real server Redis healthcheck controls quick entry and prevents fake durable saves',()=>{
  assert.match(studio,/onStorageVerified=\{setStorageVerified\}/)
  assert.match(connections,/checkGrowthStudioStorageAction\(\)/)
  assert.match(connections,/onStorageVerified\(false\)/)
  assert.match(connections,/onStorageVerified\(passed\)/)
  assert.match(connections,/result\?\.ok===true&&result\?\.verified===true/)
  assert.match(studio,/if \(!ready\|\|!storageVerified\|\|busy\) return/)
  assert.match(studio,/disabled=\{!ready\|\|!storageVerified\|\|busy\|\|!form\.title\.trim\(\)\}/)
  assert.match(studio,/ready=\{ready&&storageVerified\}/)
  assert.match(studio,/disabled=\{busy\|\|!ready\|\|!storageVerified\}/)
})

test('all existing publishing, content discovery and manual-versus-verified states remain intact',()=>{
  for(const component of [
    'GrowthStudioBulk','GrowthStudioManualInbox','GrowthStudioEvergreen',
    'GrowthStudioSourcePicker','GrowthStudioConnections',
  ])assert.ok(studio.includes('<'+component),'missing '+component)
  for(const signal of [
    'buildManualCalendarIcs','saveCsv(records)','findManualTimeConflicts',
    "publicationStatusLabel(post.status,locale)","post.status==='planned_manual'",
    "post.status==='manual_done'","post.status==='published'&&post.delivery?.url",
    "post.channel==='telegram'","telegramVerified", "confirmed:true",
  ])assert.ok(studio.includes(signal),'missing '+signal)
  assert.doesNotMatch(studio,/onClick=\{\(\)=>publishGrowthTelegramNowAction\(/)
})

test('optional storage callback is referentially stable and cannot re-trigger probe loop',()=>{
  assert.match(connections,/const NOOP_STORAGE_VERIFICATION=\(\)=>\{\}/)
  assert.match(connections,/onStorageVerified=NOOP_STORAGE_VERIFICATION/)
  assert.match(connections,/\},\[onStorageVerified\]\)/)
  assert.match(connections,/useEffect\(\(\)=>\{void verifyStorage\(\)\},\[verifyStorage\]\)/)
})

test('mobile focus targets, touch affordance, and reduced-motion support are explicit',()=>{
  assert.match(css,/\.quickLaunch\{/)
  assert.match(css,/\.quickComposerFields\{/)
  assert.match(css,/\.composerOptions\{/)
  assert.match(css,/min-height:44px/)
  assert.match(css,/@media\(max-width:430px\)/)
  assert.match(css,/@media\(max-width:750px\)/)
  assert.match(css,/focus-visible/)
  assert.match(studio,/role="status" aria-live="polite"/)
  assert.match(studio,/id="growth-studio-compose"/)
  assert.match(studio,/id="growth-studio-posts"/)
  assert.match(studio,/\{workspaceOpen&&<>/)
  assert.match(studio,/<\/>\}/)
})

test('editing a saved post scrolls to the real editor, not to the page top above the launch card',()=>{
  const start=studio.indexOf('const edit=post=>')
  const end=studio.indexOf('async function refresh()',start)
  assert.ok(start>0 && end>start)
  const handlers=studio.slice(start,end)
  assert.equal((handlers.match(/openWorkspace\('compose'\)/g)||[]).length,2)
  assert.doesNotMatch(handlers,/window\.scrollTo\(/)
  assert.match(studio,/id="growth-studio-compose"/)
})

test('revealed composer and saved posts move keyboard and screen reader focus with reduced-motion scrolling',()=>{
  const action=studio.slice(studio.indexOf('const openWorkspace=nextTab=>'),studio.indexOf('const set=field=>'))
  assert.match(action,/target\.focus\(\{preventScroll:true\}\)/)
  assert.match(action,/target\.scrollIntoView/)
  assert.match(action,/prefers-reduced-motion/)
  assert.match(studio,/id="growth-studio-compose" tabIndex=\{-1\} role="region" aria-label=\{t\.compose\}/)
  assert.match(studio,/id="growth-studio-posts" tabIndex=\{-1\} role="region" aria-label=\{t\.pending\}/)
})

test('superseded CI runs for this PR are canceled without canceling manual dispatches',()=>{
  const workflow=read('.github/workflows/hh-growth-studio.yml')
  assert.match(workflow,/concurrency:\n  group: growth-studio-/)
  assert.match(workflow,/github\.event\.pull_request\.number \|\| github\.ref/)
  assert.match(workflow,/cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/)
  assert.match(workflow,/workflow_dispatch:/)
  assert.match(workflow,/tests\/growth-studio-benchmark-quick-compose\.test\.mjs/)
})
