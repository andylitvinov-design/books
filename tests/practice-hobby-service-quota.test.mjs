import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {getHobbyServiceQuota,HOBBY_SERVICE_LIMIT} from '../lib/practitioners/service-quota.js'

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8')

test('free Hobby permits ten saved non-archived services, including drafts and review',()=>{
  assert.equal(HOBBY_SERVICE_LIMIT,10)
  assert.deepEqual(getHobbyServiceQuota([]),{tier:'hobby',limit:10,used:0,remaining:10,canAdd:true})
  const services=[
    {status:'draft'},{status:'published'},{status:'submitted'},
    {status:'changes_requested'},{status:'paused'},
    {status:'published'},{status:'published'},{status:'published'},
    {status:'draft'},{status:'published'},{status:'archived'},
  ]
  assert.deepEqual(getHobbyServiceQuota(services),{tier:'hobby',limit:10,used:10,remaining:0,canAdd:false})
  assert.equal(getHobbyServiceQuota(services.slice(0,9)).remaining,1)
  assert.equal(getHobbyServiceQuota([...services,{status:'published'}]).remaining,0)
})

test('My Practice exposes quota-gated empty-inbox service creation before metrics and keeps marketplace quota',async()=>{
  const [view,css,inbox]=await Promise.all([
    read('components/app/practice-workspace.jsx'),
    read('components/app/practice-dashboard.css'),
    read('components/app/practice-requests-overview.jsx'),
  ])
  const cta=view.indexOf('<PracticeRequestsOverview ')
  const overview=view.indexOf('className="hh-practice-overview"')
  const analytics=view.indexOf('<PracticeServiceStatistics ')
  assert.ok(cta>0&&overview>cta&&analytics>overview,'CTA must appear before metrics and analytics')
  assert.match(view,/onAddService=\{needsOnboarding[\s\S]*?: addService\}/)
  assert.match(view,/canAdd=\{serviceQuota\.canAdd\}/)
  assert.match(inbox,/summary\.total === 0[\s\S]*?\{canAdd[\s\S]*?onClick=\{onAddService\}[\s\S]*?<p className=\{styles\.quota\}/)
  assert.match(view,/onClick=\{addService\}/)
  assert.match(view,/serviceQuota\.used/)
  assert.match(view,/serviceQuota\.limit/)
  assert.match(view,/disabled=\{!serviceQuota\.canAdd\}/)
  assert.match(view,/quota=\{serviceQuota\}/)
  assert.match(view,/!canAdd&&<p className="hh-practice-limit-notice"/)
  assert.match(css,/\.hh-practice-top-cta-button/)
  assert.match(css,/@media\(max-width:600px\)/)
})

test('every authenticated service creation path enforces the quota in a transaction',async()=>{
  const repo=await read('lib/practitioners/repository.js')
  const guard=repo.indexOf('async function ensureHobbyServiceSlot')
  const onboarding=repo.indexOf('async onboarding(')
  const save=repo.indexOf('async saveService(')
  const update=repo.indexOf('async submitService(')
  assert.ok(guard>0&&onboarding>guard&&save>onboarding&&update>save)
  assert.match(repo,/status <> 'archived'/)
  assert.match(repo,/SERVICE_LIMIT_REACHED',409/)
  assert.match(repo,/const p=await ownedPractitioner\(db,actor,!id\)/)
  assert.match(repo.slice(onboarding,save),/await ensureHobbyServiceSlot\(db,p\.id\)/)
  assert.match(repo.slice(save,update),/await ensureHobbyServiceSlot\(db,p\.id\)/)
  assert.match(repo,/serviceQuota:getHobbyServiceQuota\(services\)/)
  assert.match(repo,/serviceQuota:getHobbyServiceQuota\(\)/)
})

