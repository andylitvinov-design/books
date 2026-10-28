import test from 'node:test'
import vm from 'node:vm'
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

test('My Practice exposes Add service and quota before metrics/analytics on mobile',async()=>{
  const [view,css]=await Promise.all([
    read('components/app/practice-workspace.jsx'),
    read('components/app/practice-dashboard.css'),
  ])
  const cta=view.indexOf('data-create-practice-service')
  const buttonEnd=view.indexOf('</button>',cta)
  const action=view.slice(cta,buttonEnd)
  const quota=view.indexOf('data-practice-service-quota',cta)
  const overview=view.indexOf('className="hh-practice-overview"')
  const analytics=view.indexOf('<PracticeServiceStatistics ')
  assert.ok(cta>0&&quota>cta&&buttonEnd>quota&&overview>buttonEnd&&analytics>overview,
    'Create service and its live quota must appear before metrics and analytics')
  const reikiCreation=view.indexOf('data-create-practice-reiki')
  assert.ok(reikiCreation>buttonEnd&&overview>reikiCreation,'Reiki creation remains before overview')
  assert.match(action,/onClick=\{\(\)=>startService\(\)\}/)
  const quotaExpression=action.match(/data-practice-service-quota>\{([^}]+)\}/)?.[1]
  const disabledExpression=action.match(/disabled=\{([^}]+)\}/)?.[1]
  const quotaSource=view.match(/const serviceQuota=([^\n]+)/)?.[1]
  const copyStart=view.indexOf('const marketplaceCopy=')
  const copyEnd=view.indexOf('const hasProfile=',copyStart)
  assert.ok(quotaExpression&&disabledExpression&&quotaSource&&copyStart>=0&&copyEnd>copyStart)
  const copySource=view.slice(copyStart,copyEnd)+';marketplaceCopy'
  for(const locale of ['en','ru','es']){
    const marketplaceCopy=vm.runInNewContext(copySource,{locale,ru:locale==='ru'})
    assert.equal(marketplaceCopy.hobby,{en:'Hobby · Free',ru:'Hobby · бесплатно',es:'Hobby · gratis'}[locale])
    for(const sample of [
      {data:{},services:[],used:0,disabled:false},
      {data:{},services:[{status:'draft'},{status:'submitted'},{status:'published'},{status:'archived'}],used:3,disabled:false},
      {data:{},services:Array.from({length:10},()=>({status:'draft'})),used:10,disabled:true},
      {data:{serviceQuota:{tier:'hobby',used:4,limit:10,remaining:6,canAdd:true}},services:[],used:4,disabled:false},
    ]){
      const serviceQuota=vm.runInNewContext(quotaSource,{...sample,getHobbyServiceQuota})
      const text=vm.runInNewContext(quotaExpression,{marketplaceCopy,serviceQuota})
      assert.equal(text,marketplaceCopy.hobby+' · '+sample.used+' / 10 '+marketplaceCopy.slots)
      assert.equal(vm.runInNewContext(disabledExpression,{needsOnboarding:false,serviceQuota}),sample.disabled)
      assert.equal(vm.runInNewContext(disabledExpression,{needsOnboarding:true,serviceQuota}),false,
        'new masters retain the existing registration handoff')
    }
  }
  // Keep the later approved community disclosure; do not move it to the first screen.
  assert.match(view,/!needsOnboarding&&!activePanel&&<details className="hh-practice-v4-community">/)
  assert.match(css,/> \.hh-practice-first-actions\{order:2\}/)
  assert.match(css,/> \.hh-practice-v4-community\{order:12\}/)
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
